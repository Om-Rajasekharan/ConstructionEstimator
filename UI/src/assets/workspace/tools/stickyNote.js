// Sticky Note Tool
// Usage: Attach a note to a page or coordinate in a document
class StickyNote {
  constructor({ author, page, x, y, text, createdAt = new Date(), color = '#ffff88' }) {
    this.author = author; // user id or name
    this.page = page; // page number
    this.x = x; // x coordinate (relative, e.g. 0-1)
    this.y = y; // y coordinate (relative, e.g. 0-1)
    this.text = text;
    this.createdAt = createdAt;
    this.color = color;
    this.resolved = false;
    this.replies = [];
  }

  addReply({ author, text }) {
    this.replies.push({ author, text, createdAt: new Date() });
  }

  markResolved() {
    this.resolved = true;
  }

  static handleMouseDown({ e, canvasRef, selectedPage, setStickyNotes, stickyNotes }) {
    if (!canvasRef.current) return;
    if (e.target && e.target.closest('.sticky-note-div')) return;
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setStickyNotes(notes => [
      ...notes,
      {
        x,
        y,
        page: selectedPage || 1,
        text: '',
        color: '#ffe066',
        createdAt: new Date(),
        author: 'me',
        editing: true,
        width: 0.18,
        height: 0.12,
      },
    ]);
  }

  static handleMouseDownImage({ e, imgDiv, imgPage, setStickyNotes, stickyNotes }) {
    if (!imgDiv) return;
    if (e.target && e.target.closest('.sticky-note-div')) return;
    e.stopPropagation();
    const rect = imgDiv.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setStickyNotes(notes => [
      ...notes,
      {
        x,
        y,
        page: imgPage,
        text: '',
        color: '#ffe066',
        createdAt: new Date(),
        author: 'me',
        editing: true,
        width: 0.18,
        height: 0.12,
      },
    ]);
  }
}

export default StickyNote;
