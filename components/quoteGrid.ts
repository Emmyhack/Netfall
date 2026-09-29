/**
 * The results table sizes itself against its own container, not the viewport,
 * so it cannot break when it is placed inside a narrower column. The classes
 * are declared in app/globals.css under a `@container` query; these constants
 * just keep the names in one place.
 */

/** Establishes the container. Goes on the element that wraps header + rows. */
export const QUOTE_CONTAINER = 'quotes';

/** One row, and the column header, share a grid template. */
export const QUOTE_ROW = 'qrow';
export const QUOTE_HEAD = 'qhead';

/** Fixed content height for a resolved row, so skeletons reserve the space. */
export const QUOTE_ROW_CONTENT_HEIGHT = 42;
