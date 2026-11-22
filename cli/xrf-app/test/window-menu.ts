import { $ } from "@wdio/globals";

/**
 * Chooses an entry of the window's menu as a pointer does: the caption's menu button opens the menubar on its first
 * menu, another menu opens by its name, and the entry is the one whose text holds `entry`.
 *
 * @param menu - The menu's name, as the menubar shows it.
 * @param entry - Text of the entry, its shortcut aside.
 */
export async function chooseWindowMenuEntry(menu: string, entry: string): Promise<void> {
  const menubar = $('[role="menubar"]');

  // A click landing while a tool is still mounting is lost to the focus its page takes, so the menubar is opened again
  // until it shows; a shown menubar is never clicked, which would close it.
  for (let attempt: number = 0; !(await menubar.isDisplayed()); attempt++) {
    if (attempt === 3) {
      throw new Error("The window's menubar did not open after three clicks on its menu button.");
    }

    await $('button[aria-label="Menu"]').click();
    await menubar.waitForDisplayed({ timeout: 2_000 }).catch(() => undefined);
  }

  const opened = menubar.$(`button=${menu}`);

  if ((await opened.getAttribute("aria-expanded")) !== "true") {
    await opened.click();
  }

  // The button reads expanded a render before its menu is on screen, so the menu is waited for, not assumed.
  const list = $(`[role="menu"][aria-label="${menu}"]`);

  await list.waitForDisplayed({ timeout: 5_000 });
  await list.$(`li*=${entry}`).click();
}

/** Closes the open tool through File > Close and goes back to the launcher. */
export async function closeTool(): Promise<void> {
  await chooseWindowMenuEntry("File", "Close");
}
