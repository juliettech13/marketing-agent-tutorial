import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export class Memory {
  private messages: ChatCompletionMessageParam[] = [];

  constructor(systemPrompt: string) {
    this.messages.push({ role: "system", content: systemPrompt });
  }

  add(role: ChatCompletionMessageParam["role"], content: string, extra: any = {}) {
    this.messages.push({ role, content, ...extra } as ChatCompletionMessageParam);
    if (this.messages.length > 11) {
      this.messages = [this.messages[0]!, ...this.messages.slice(-10)];
    }
  }

  getAll() {
    return this.messages;
  }
}
