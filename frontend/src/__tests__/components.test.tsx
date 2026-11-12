import React from "react";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthModal } from "@/components/AuthModal";
import { ChartBlock } from "@/components/ChartBlock";
import { Composer } from "@/components/Composer";
import { HeroAiCore } from "@/components/HeroAiCore";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { SurajLogo } from "@/components/SurajLogo";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { WorkspacePreview } from "@/components/WorkspacePreview";
import { ArchitectureAndPricingSection } from "@/components/landing/ArchitectureAndPricingSection";
import { AnimatedFeatureSlider } from "@/components/landing/AnimatedFeatureSlider";
import { FaqSection } from "@/components/landing/FaqSection";
import { AIOrbitalCore, AnimatedBackground } from "@/components/background";

describe("SURaj AI Frontend Components", () => {
  it("renders WelcomeScreen with SURaj AI branding and unconfigured API notice", () => {
    const onSelectPrompt = vi.fn();
    const onOpenSettings = vi.fn();
    render(
      <WelcomeScreen
        onSelectPrompt={onSelectPrompt}
        onOpenSettings={onOpenSettings}
        capabilities={{
          database_type: "sqlite",
          database_connected: true,
          llm_providers: [
            {
              id: "openai",
              name: "OpenAI",
              configured: false,
              models: ["gpt-4o-mini"],
              supports_vision: true,
              supports_streaming: true,
              required_env_var: "OPENAI_API_KEY",
            },
          ],
          image_generation_configured: false,
          image_providers: [],
          file_processing: {},
          rate_limit_rpm: 30,
          rate_limit_daily_tokens: 250000,
        }}
      />
    );
    expect(screen.getByText(/SURaj/i)).toBeInTheDocument();
    const keyBtn = screen.getByRole("button", { name: /LLM API Key Required/i });
    fireEvent.click(keyBtn);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("handles Composer send, attachment removal, and Stop button", () => {
    const onSend = vi.fn();
    const onStop = vi.fn();
    const onRemove = vi.fn();
    const { rerender } = render(
      <Composer
        value="Hello SURaj AI"
        onChange={vi.fn()}
        onSend={onSend}
        onStop={onStop}
        onUploadFiles={vi.fn(async () => {})}
        attachments={[
          {
            id: "att-1",
            filename: "report.pdf",
            content_type: "application/pdf",
            file_size: 1024,
            kind: "pdf",
            analysis_json: {},
            created_at: new Date().toISOString(),
          },
        ]}
        onRemoveAttachment={onRemove}
        isStreaming={false}
        isUploading={false}
        onOpenImageStudio={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText("Send message"));
    expect(onSend).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("Remove report.pdf"));
    expect(onRemove).toHaveBeenCalledWith("att-1");

    rerender(
      <Composer
        value=""
        onChange={vi.fn()}
        onSend={onSend}
        onStop={onStop}
        onUploadFiles={vi.fn(async () => {})}
        attachments={[]}
        onRemoveAttachment={onRemove}
        isStreaming={true}
        isUploading={false}
        onOpenImageStudio={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText("Stop generation"));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("normalizes unknown chart types to bar and switches chart tabs", () => {
    render(
      <ChartBlock
        payload={{
          // @ts-expect-error testing invalid runtime type fallback
          type: "scatter",
          title: "Sales Data",
          xKey: "quarter",
          series: ["revenue"],
          data: [
            { quarter: "Q1", revenue: 100 },
            { quarter: "Q2", revenue: 200 },
          ],
        }}
      />
    );
    expect(screen.getByText("Sales Data")).toBeInTheDocument();
    const barTab = screen.getByRole("button", { name: "bar" });
    expect(barTab.className).toContain("font-semibold");
    fireEvent.click(screen.getByRole("button", { name: "line" }));
    expect(screen.getByRole("button", { name: "line" }).className).toContain("font-semibold");
  });

  it("renders Markdown, Hindi text, tables, and strips unsafe XSS scripts", () => {
    const md = [
      "नमस्ते SURaj AI",
      "",
      "| Col | Val |",
      "|---|---|",
      "| A | 10 |",
      "",
      "<script>alert('xss')</script>",
      "",
      "[bad](javascript:alert(1))",
    ].join("\n");

    const { container } = render(<MarkdownRenderer content={md} isDark={true} />);
    expect(screen.getByText(/नमस्ते SURaj AI/)).toBeInTheDocument();
    expect(container.querySelector("table")).toBeInTheDocument();
    expect(container.querySelector("script")).not.toBeInTheDocument();
    const link = screen.getByText("bad");
    expect(link.getAttribute("href") || "").not.toContain("javascript:");
  });

  it("toggles AuthModal between Sign In and Create Account and toggles password visibility", () => {
    render(<AuthModal isOpen={true} onClose={vi.fn()} onAuthenticated={vi.fn()} />);
    expect(screen.getByText("Sign in to SURaj AI")).toBeInTheDocument();
    const loginPwInput = screen.getByPlaceholderText("Enter your password") as HTMLInputElement;
    expect(loginPwInput.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(loginPwInput.type).toBe("text");

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));
    expect(screen.getByText("Create your SURaj AI account")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your full name")).toBeInTheDocument();
    const confirmPwInput = screen.getByPlaceholderText("Re-enter password") as HTMLInputElement;
    expect(confirmPwInput.type).toBe("password");
    const showButtons = screen.getAllByRole("button", { name: "Show password" });
    fireEvent.click(showButtons[showButtons.length - 1]);
    expect(confirmPwInput.type).toBe("text");
  });

  it("renders SurajLogo icon-only and full uppercase SURAJ AI variants cleanly", () => {
    const { rerender } = render(<SurajLogo showSub />);
    expect(screen.getByText("SURAJ")).toBeInTheDocument();
    expect(screen.getByText("AI")).toBeInTheDocument();
    rerender(<SurajLogo iconOnly />);
    expect(screen.queryByText("SURAJ")).not.toBeInTheDocument();
  });

  it("renders HeroAiCore, WorkspacePreview, ArchitectureAndPricingSection, and FaqSection", () => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    render(<HeroAiCore />);
    expect(screen.getByText("SURAJ AI CORE")).toBeInTheDocument();

    render(<WorkspacePreview capabilities={null} />);
    expect(screen.getByText("Meet Your Intelligent Workspace")).toBeInTheDocument();
    expect(screen.getByText("Sample Demonstration Output")).toBeInTheDocument();

    render(<ArchitectureAndPricingSection capabilities={null} />);
    expect(screen.getByText("From Question to Intelligence")).toBeInTheDocument();
    expect(screen.getByText("Pro Workspace")).toBeInTheDocument();

    render(<FaqSection />);
    expect(screen.getByText("Frequently Asked Questions")).toBeInTheDocument();
    expect(screen.getByText("Stay Ahead of Artificial Intelligence")).toBeInTheDocument();
  });

  it("renders AnimatedBackground variants and AIOrbitalCore as non-blocking decorative layers", () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    const { container: bgContainer } = render(
      <div>
        <AnimatedBackground variant="home" />
        <AnimatedBackground variant="rag" />
        <AnimatedBackground variant="memory" />
        <AnimatedBackground variant="tools" />
        <AnimatedBackground variant="pricing" />
        <AnimatedBackground variant="footer" />
        <AIOrbitalCore />
      </div>
    );
    const layers = bgContainer.querySelectorAll("[data-bg-variant]");
    expect(layers.length).toBe(6);
    layers.forEach((layer) => {
      expect(layer.getAttribute("aria-hidden")).toBe("true");
      expect(layer.className).toContain("pointer-events-none");
    });
    expect(bgContainer.querySelectorAll(".perspective-grid-floor").length).toBeGreaterThanOrEqual(2);
  });

  it("renders AnimatedFeatureSlider and advances slides interactively", async () => {
    render(<AnimatedFeatureSlider />);
    expect(screen.getByRole("heading", { name: /Multi-Provider SSE Streaming/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Grounded Knowledge RAG/i })).toBeInTheDocument();
    });
  });
});
