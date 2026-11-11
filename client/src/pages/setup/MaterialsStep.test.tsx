import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { jsonResponse, mockFetch, renderWithProviders } from "../../test/render";
import { emptyDraft, type Draft } from "./draft";
import MaterialsStep from "./MaterialsStep";
import { SAMPLE_JOB_DESCRIPTION, SAMPLE_RESUME } from "./sample";

const models200 = (url: string) =>
  url.endsWith("/models")
    ? jsonResponse({
        models: [
          { id: "groq:openai/gpt-oss-120b", label: "GPT-OSS 120B", provider: "Groq", isDefault: true },
          { id: "mistral:mistral-small-latest", label: "Mistral Small", provider: "Mistral", isDefault: false },
        ],
      })
    : undefined;

describe("MaterialsStep", () => {
  it("offers model switcher when the parse model hits rate limit or is busy", async () => {
    let parseCalls = 0;
    mockFetch(models200, (url, init) => {
      if (url.endsWith("/setup/parse")) {
        parseCalls++;
        if (parseCalls === 1) {
          return jsonResponse({ code: "MODEL_UNAVAILABLE", message: "GPT-OSS 120B has hit its rate limit." }, 503);
        }
        const body = JSON.parse(init.body as string);
        expect(body.modelId).toBe("mistral:mistral-small-latest");
        return jsonResponse({
          profile: { name: "Jane", headline: "", yearsOfExperience: 3, skills: [], experience: [], projects: [], education: [] },
          requirements: { title: "Dev", company: null, seniority: null, mustHave: [], niceToHave: [], responsibilities: [] },
        });
      }
      if (url.endsWith("/setup/match")) {
        return jsonResponse({ match: { summary: "Good fit", strengths: [], gaps: [] } });
      }
      return undefined;
    });

    const update = vi.fn();
    const draft: Draft = {
      ...emptyDraft,
      resumeText: "Jane Doe resume",
      jobDescription: "Developer job description",
    };

    renderWithProviders(<MaterialsStep draft={draft} update={update} />);

    await userEvent.click(screen.getByRole("button", { name: /analyse/i }));

    expect(await screen.findByText("The model is busy")).toBeTruthy();
    expect(screen.getByText(/hit its rate limit/)).toBeTruthy();

    const switchBtn = screen.getByRole("button", { name: /switch and continue/i });
    expect(switchBtn).toBeTruthy();

    // Select Mistral Small
    await userEvent.click(screen.getByLabelText("Or switch to"));
    await userEvent.click(await screen.findByRole("option", { name: /mistral small/i }));

    await userEvent.click(screen.getByRole("button", { name: /switch and continue/i }));

    expect(update).toHaveBeenCalledWith({ modelId: "mistral:mistral-small-latest" });
  });

  it("fills both fields with the sample and switches to pasted text", async () => {
    mockFetch(models200);
    const update = vi.fn();

    renderWithProviders(<MaterialsStep draft={emptyDraft} update={update} />);

    await userEvent.click(screen.getByRole("button", { name: /try a sample/i }));

    expect(update).toHaveBeenCalledWith({
      resumeSource: "paste",
      resumeText: SAMPLE_RESUME,
      resumeFileName: null,
      jobDescription: SAMPLE_JOB_DESCRIPTION,
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks before replacing what the candidate already added", async () => {
    mockFetch(models200);
    const update = vi.fn();
    const draft: Draft = { ...emptyDraft, resumeText: "Jane Doe resume" };

    renderWithProviders(<MaterialsStep draft={draft} update={update} />);

    await userEvent.click(screen.getByRole("button", { name: /try a sample/i }));
    expect(update).not.toHaveBeenCalled();

    await userEvent.click(await screen.findByRole("button", { name: /use the sample/i }));
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ resumeText: SAMPLE_RESUME, jobDescription: SAMPLE_JOB_DESCRIPTION })
    );
  });
});
