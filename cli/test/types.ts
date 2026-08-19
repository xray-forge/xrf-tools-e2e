/**
 * Value that may be absent.
 *
 * @remarks
 * A structural miss is `undefined`. `null` is never used for absence in this codebase.
 */
export type Optional<T> = T | undefined;

/**
 * Value that may be deliberately empty.
 */
export type Nullable<T> = T | null;

/**
 * Value that is genuinely tri-state.
 */
export type Maybe<T> = T | null | undefined;
