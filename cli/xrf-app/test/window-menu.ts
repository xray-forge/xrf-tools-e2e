import { $ } from "@wdio/globals";

/**
 * Chooses an entry of the window's menu as a pointer does: the caption's menu button opens the menubar on its first
 * menu, another menu opens by its name, and the entry is the one whose text holds `entry`.
 *
 * @param menu - The menu's name, as the menubar shows it.
 * @param entry - Text of the entry, its shortcut aside.
 */
export async function chooseWindowMenuEntry(menu: string, entry: string): Promise<void> {
  await $('button[aria-label="Menu"]').click();

  const menubar = $('[role="menubar"]');

  await menubar.waitForDisplayed({ timeout: 5_000 });

  const opened = menubar.$(`button=${menu}`);

  if ((await opened.getAttribute("aria-expanded")) !== "true") {
    await opened.click();
  }

  await $(`[role="menu"][aria-label="${menu}"]`).$(`li*=${entry}`).click();
}

/** Closes the open tool through File > Close and goes back to the launcher. */
export async function closeTool(): Promise<void> {
  await chooseWindowMenuEntry("File", "Close");
}
