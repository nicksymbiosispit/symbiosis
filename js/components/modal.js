import { $ } from '../utils/dom.js';

const CONTENT = {
  help: {
    title: 'Symbiosis Help',
    text: 'Create an account or sign in, then type a message in #lobby. Messages appear live for everyone who is connected.'
  },
  rules: {
    title: 'Community Rules',
    text: 'Be decent, do not spam, and do not share private information. This starter intentionally keeps moderation simple; add reporting and moderation tools before opening it to a large public audience.'
  }
};

export function createModalController() {
  const modal = $('infoModal');
  const close = () => { modal.hidden = true; };
  const open = ({ title, text }) => {
    $('modalTitle').textContent = title;
    $('modalText').textContent = text;
    modal.hidden = false;
  };

  $('helpLink').addEventListener('click', (event) => { event.preventDefault(); open(CONTENT.help); });
  $('rulesLink').addEventListener('click', (event) => { event.preventDefault(); open(CONTENT.rules); });
  $('modalClose').addEventListener('click', close);
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) close(); });
}
