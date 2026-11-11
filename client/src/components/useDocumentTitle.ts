import { useEffect } from "react";

const APP_TITLE = "AI Interviewer";

/** Names the browser tab after the page; null for the home page's own title. */
export function useDocumentTitle(title: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_TITLE}` : `${APP_TITLE}: practise interviews for the job you want`;
  }, [title]);
}
