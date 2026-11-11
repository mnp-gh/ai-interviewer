import { useQuery, type QueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { InterviewSummary, InterviewView, ModelOption, SpeechModelsResponse } from "./types";

export const queryKeys = {
  models: ["models"] as const,
  speechModels: ["speech-models"] as const,
  account: ["account"] as const,
  interviews: ["interviews"] as const,
  interview: (id: string) => ["interviews", id] as const,
};

export function useModels() {
  return useQuery({
    queryKey: queryKeys.models,
    queryFn: () => api.get<{ models: ModelOption[] }>("/models").then((res) => res.models),
    staleTime: 5 * 60_000,
  });
}

export function useSpeechModels() {
  return useQuery({
    queryKey: queryKeys.speechModels,
    queryFn: () => api.get<SpeechModelsResponse>("/speech-models"),
    staleTime: 5 * 60_000,
  });
}

export function useInterviews() {
  return useQuery({
    queryKey: queryKeys.interviews,
    queryFn: () => api.get<{ interviews: InterviewSummary[] }>("/interviews").then((res) => res.interviews),
  });
}

export function useInterview(id: string) {
  return useQuery({
    queryKey: queryKeys.interview(id),
    queryFn: () => api.get<{ interview: InterviewView }>(`/interviews/${id}`).then((res) => res.interview),
  });
}

/** Stores a fresh copy of an interview and marks the history list stale. */
export function rememberInterview(queryClient: QueryClient, interview: InterviewView) {
  const queryKey = queryKeys.interview(interview.id);
  const store = () => {
    queryClient.setQueryData(queryKey, interview);
    void queryClient.invalidateQueries({ queryKey: queryKeys.interviews, exact: true });
  };
  // A load already under way would land after this copy and replace it with an older one. Cancelling
  // reverts the cache once the load stops, so the fresh copy is stored after that.
  if (queryClient.isFetching({ queryKey, exact: true })) void queryClient.cancelQueries({ queryKey, exact: true }).then(store);
  else store();
}
