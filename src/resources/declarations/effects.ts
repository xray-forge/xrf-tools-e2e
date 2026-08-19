// Declaration source for export-externs. The parser only walks files that parse as a module, so a
// file with no import or export is skipped whole; the empty export below is what makes this one a
// module. Externs are top-level `extern(name, value)` calls with a string literal name, and JSDoc
// above the call becomes the documentation in the manifest.

export {};

/**
 * Gives an item to the actor.
 *
 * @param section - Item section to spawn.
 */
extern("xr_effects.give_item", (section: string): void => {});

/**
 * Checks whether the actor is alive.
 */
extern("xr_conditions.is_alive", (): boolean => true);

extern("xr_effects.undocumented", (count: number, label: string): void => {});
