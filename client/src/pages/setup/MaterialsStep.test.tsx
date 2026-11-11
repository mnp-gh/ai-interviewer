import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { jsonResponse, mockFetch, renderWithProviders } from "../../test/render";
import { emptyDraft, type Draft } from "./draft";
import MaterialsStep from "./MaterialsStep";

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
});
