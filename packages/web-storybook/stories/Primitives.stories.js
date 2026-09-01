const button = (label, variant = "primary") => `<button class="pa-button pa-button--${variant}">${label}</button>`;

export default { title: "Primitives/Button" };

export const Primary = { render: () => button("Continue") };
export const Destructive = { render: () => button("Delete", "destructive") };
export const Disabled = { render: () => `<button class="pa-button pa-button--primary" disabled>Continue</button>` };
export const TextField = {
  render: () => `<label style="display:grid;gap:0.5rem;min-width:20rem">Workspace name<input class="pa-input" aria-describedby="hint" /><span id="hint">Visible label and supporting text</span></label>`,
};
