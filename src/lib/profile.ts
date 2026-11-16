"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { qk } from "./session";
import type { EditorResponse, MeResponse, Profile, ProfilePatch } from "./types";

/** Write a profile into every cache that holds one (me + editor), so the shell, editor and preview agree. */
export function setProfileEverywhere(qc: ReturnType<typeof useQueryClient>, profile: Profile) {
  qc.setQueryData<MeResponse | null>(qk.me, (m) => (m ? { ...m, profile } : m));
  qc.setQueryData<EditorResponse>(qk.editor, (e) => (e ? { ...e, profile } : e));
}

/** PATCH /profile with an optimistic update and rollback. */
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => api.profile.update(patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: qk.me });
      const prev = qc.getQueryData<MeResponse | null>(qk.me)?.profile;
      if (prev) setProfileEverywhere(qc, { ...prev, ...patch });
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) setProfileEverywhere(qc, ctx.prev);
    },
    onSuccess: (profile) => setProfileEverywhere(qc, profile),
  });
}
