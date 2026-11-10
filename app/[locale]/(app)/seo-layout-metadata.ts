import type { Metadata } from "next";

/** Private app surfaces should stay out of search indexes. */
export const protectedAppMetadata: Metadata = {
    robots: {
        index: false,
        follow: false,
        nocache: true,
    },
};
