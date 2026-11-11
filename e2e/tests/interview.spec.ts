import { expect, test } from "@playwright/test";

const RESUME = "Jane Doe. Backend engineer with 4 years of Node.js and MongoDB at Acme, building REST APIs.";
const JOB = "Senior Backend Engineer at Globex. Must have Node.js and distributed systems. Own the API platform.";
const QUESTIONS = 3;

test("a candidate sets up a coached interview, answers every question and gets a report", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Start a practice interview" }).click();

  // Resume & job
  await page.getByRole("tab", { name: "Paste text" }).click();
  await page.getByRole("textbox", { name: "Resume", exact: true }).fill(RESUME);
  await page.getByRole("textbox", { name: "Job description" }).fill(JOB);
  await page.getByRole("button", { name: "Analyse", exact: true }).click();

  // Review: the scripted AI's profile, requirements and match
  await expect(page.getByRole("heading", { name: "How you match" })).toBeVisible();
  await expect(page.getByText("You fit well.")).toBeVisible();
  await page.getByRole("button", { name: "Looks right, continue" }).click();

  // Settings: typed answers, Coach mode, the fewest questions
  const length = page.getByRole("slider", { name: "Number of questions" });
  await length.focus();
  await length.press("Home");
  await expect(page.getByText(`Length: ${QUESTIONS} questions`)).toBeVisible();
  await page.getByRole("button", { name: /^Coach/ }).click();
  await expect(page.getByRole("button", { name: /^Coach/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /^Typed/ }).click();
  await expect(page.getByRole("button", { name: /^Typed/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Start interview" }).click();

  // The interview: each question streams in, and the coach's feedback follows each answer.
  await expect(page).toHaveURL(/\/interviews\/[\w-]+$/);
  const answerBox = page.getByRole("textbox", { name: "Your answer" });
  for (let number = 1; number <= QUESTIONS; number++) {
    await expect(answerBox).toBeVisible();
    await answerBox.fill(`Answer ${number}: I led a migration to MongoDB and cut API latency by 40%.`);
    await page.getByRole("button", { name: "Submit answer" }).click();
    // Earlier questions collapse, so the newest feedback is the last match.
    await expect(page.getByText("Good structure. Add a concrete metric next time.").last()).toBeVisible();
    const next = number < QUESTIONS ? "Next question" : "Finish and see my report";
    await page.getByRole("button", { name: next }).click();
  }

  // The report
  await expect(page.getByLabel(/^Overall score [\d.]+ out of 10$/)).toBeVisible();
  await expect(page.getByText("You communicated clearly.")).toBeVisible();
  const perQuestion = page.getByRole("region", { name: "Question by question" });
  await expect(perQuestion.getByRole("heading", { level: 3 })).toHaveCount(QUESTIONS);
});
