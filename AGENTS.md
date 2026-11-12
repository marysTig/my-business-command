<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Task Kanban uses dnd-kit with dedicated drag handles and the existing task save hook; this supports pointer and keyboard moves without interfering with editing controls.

## Bot-drivable dashboard (standing requirement)

Every change must keep the dashboard easy for an external bot (Telegram bot, browser automation) to drive. Before shipping UI work, check:

- **Native controls for required input.** Use native `<select>` and `<input>` (visible, not `hidden`) for anything a bot must set. Portaled Radix `Select`/frilly pickers are fine only as a secondary path; a bot cannot type into them reliably.
- **No OS-level dialogs as the only path.** A button must never require the native file picker (`input.click()`) to complete an action: show a real `<input type="file">` and upload the chosen file on click.
- **Stable test hooks.** Give every actionable control a `data-testid` (`crud-new`, `crud-search`, `form-save`, `field-<name>`, `prospect-add`, …) so automation can target it without relying on copy or DOM shape.
- **Keyboard and script parity.** Anything doable by mouse hover/drag must also work by typing a value or clicking directly.
- **API mirror for mutations.** Every write a bot may need (tasks, records, research, prospect files, …) must exist under the key-protected `/api/*` routes in `src/lib/api/agent-api.ts`, authenticated with `DASHBOARD_API_KEY`, documented in the file header and in `GET /api`.
- **No hidden state.** Keep labels/placeholders stable, avoid actions that depend on hover-only menus, toasts, or timing.
