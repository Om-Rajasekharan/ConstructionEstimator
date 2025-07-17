// Pan Tool (for completeness, but logic is handled in DocumentViewer)
class Pan {
  constructor({ author, page, createdAt = new Date() }) {
    this.author = author;
    this.page = page;
    this.createdAt = createdAt;
  }
}

export default Pan;
