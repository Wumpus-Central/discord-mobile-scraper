import type { Embed, EmbedField } from "./types.js";

export class EmbedBuilder {
  private embed: Embed = { fields: [] };

  title(value: string): this {
    this.embed.title = value;
    return this;
  }

  description(value: string): this {
    this.embed.description = value;
    return this;
  }

  url(value: string): this {
    this.embed.url = value;
    return this;
  }

  color(value: number): this {
    this.embed.color = value;
    return this;
  }

  addField(name: string, value: string, inline = false): this {
    const fields = this.embed.fields ?? [];
    const field: EmbedField = { name, value };
    if (inline) {
      field.inline = true;
    }
    fields.push(field);
    this.embed.fields = fields;
    return this;
  }

  build(): Embed {
    return this.embed;
  }
}
