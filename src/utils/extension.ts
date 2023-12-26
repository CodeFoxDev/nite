export class FileUrl {
  id: string;
  extension: string;
  ext: string;

  constructor(id: string) {
    this.id = id;

    this.extension = this.#getExtension();
    this.ext = this.extension;
  }
  #getExtension() {
    const s = this.id.split(".");
    return s[s.length - 1];
  }
}
