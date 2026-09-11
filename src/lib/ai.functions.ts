import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseAiResponse, SYSTEM_PROMPT } from "./codegen";

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        prompt: z.string().min(1).max(8000),
        modelId: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { chatWithTarget, resolveChatTarget, getPlatformSettings } = await import(
      "@/server/ai.server"
    );
    const settings = await getPlatformSettings();

    const { data: project } = await context.supabase
      .from("projects")
      .select("id, name, repo_full_name, repo_branch")
      .eq("id", data.projectId)
      .maybeSingle();
    if (!project) throw new Error("Project not found");

    const { data: wallet } = await context.supabase
      .from("credit_wallets")
      .select("balance")
      .eq("user_id", context.userId)
      .maybeSingle<{ balance: number | null }>();
    const balance = wallet?.balance ?? 0;
    if (balance < settings.limits.chat_cost) {
      throw new Error("You are out of credits. Top up on the Credits & payments page.");
    }

    const [{ data: history }, { data: files }] = await Promise.all([
      context.supabase
        .from("chat_messages")
        .select("role, content")
        .eq("project_id", data.projectId)
        .order("created_at")
        .limit(40),
      context.supabase
        .from("project_files")
        .select("path, content")
        .eq("project_id", data.projectId),
    ]);

    const fileContext = (files ?? []).length
      ? `Current project files:\n${(files ?? [])
          .map((f) => `<lov-file path="${f.path}">\n${f.content}\n</lov-file>`)
          .join("\n")}`
      : "The project has no files yet. Create index.html first.";

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      {
        role: "system" as const,
        content: `Project: ${project.name}${
          project.repo_full_name ? ` (GitHub repo ${project.repo_full_name}@${project.repo_branch})` : ""
        }\n\n${fileContext}`,
      },
      ...(history ?? []).map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      })),
      { role: "user" as const, content: data.prompt },
    ];

    await context.supabase.from("chat_messages").insert({
      project_id: data.projectId,
      user_id: context.userId,
      role: "user",
      content: data.prompt,
    });

    const target = await resolveChatTarget(data.modelId, settings.models.chat);
    const raw = await chatWithTarget(target, messages);
    const parsed = parseAiResponse(raw);

    if (parsed.files.length) {
      // Snapshot the pre-change state so the user can roll back later.
      await context.supabase.from("project_versions").insert({
        project_id: data.projectId,
        user_id: context.userId,
        label: data.prompt.slice(0, 80),
        files: (files ?? []) as unknown as never,
      });
      const { error } = await context.supabase.from("project_files").upsert(
        parsed.files.map((f) => ({
          project_id: data.projectId,
          user_id: context.userId,
          path: f.path,
          content: f.content,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "project_id,path" },
      );
      if (error) throw new Error(error.message);
    }

    await context.supabase.from("chat_messages").insert({
      project_id: data.projectId,
      user_id: context.userId,
      role: "assistant",
      content: parsed.message,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("usage_events").insert({
      user_id: context.userId,
      project_id: data.projectId,
      kind: "chat",
      model: target.provider ? `${target.provider.label}/${target.model}` : target.model,
      credits: settings.limits.chat_cost,
    });

    const { error: spendError } = await context.supabase.rpc("spend_credits", {
      p_amount: settings.limits.chat_cost,
      p_reason: "chat",
      p_metadata: { project_id: data.projectId },
    });
    if (spendError) throw new Error(spendError.message);

    return { message: parsed.message, changedFiles: parsed.files.map((f) => f.path) };
  });

export const generateAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid().optional(),
        prompt: z.string().min(1).max(2000),
        kind: z.enum(["image", "logo", "icon", "banner"]).default("image"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { generateImage, getPlatformSettings } = await import("@/server/ai.server");
    const settings = await getPlatformSettings();
    if (!settings.features.image_generation) {
      throw new Error("Image generation is disabled by the administrator.");
    }

    const { data: wallet } = await context.supabase
      .from("credit_wallets")
      .select("balance")
      .eq("user_id", context.userId)
      .maybeSingle<{ balance: number | null }>();
    const balance = wallet?.balance ?? 0;
    if (balance < settings.limits.image_cost) {
      throw new Error("You are out of credits. Top up on the Credits & payments page.");
    }

    const styleHint: Record<string, string> = {
      image: "High quality web image.",
      logo: "A clean, modern vector-style logo mark on a solid white background.",
      icon: "A simple, bold app icon on a solid white background.",
      banner: "A wide website hero banner, 16:9.",
    };

    const dataUrl = await generateImage(
      settings.models.image,
      `${styleHint[data.kind]} ${data.prompt}`,
    );

    const { data: asset, error } = await context.supabase
      .from("assets")
      .insert({
        project_id: data.projectId ?? null,
        user_id: context.userId,
        kind: data.kind,
        prompt: data.prompt,
        data_url: dataUrl,
      })
      .select("id, kind, prompt, data_url, created_at")
      .single();
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("usage_events").insert({
      user_id: context.userId,
      project_id: data.projectId ?? null,
      kind: "image",
      model: settings.models.image,
      credits: settings.limits.image_cost,
    });

    const { error: spendError } = await context.supabase.rpc("spend_credits", {
      p_amount: settings.limits.image_cost,
      p_reason: "image_generation",
      p_metadata: { project_id: data.projectId ?? null, kind: data.kind },
    });
    if (spendError) throw new Error(spendError.message);

    return asset;
  });

export const listAssets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("assets")
      .select("id, kind, prompt, data_url, created_at")
      .order("created_at", { ascending: false })
      .limit(60);
    if (data.projectId) query = query.eq("project_id", data.projectId);
    const { data: rows } = await query;
    return rows ?? [];
  });
