import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ProtectedLayoutClient } from "./protected-layout-client";
import { protectedAppMetadata } from "./seo-layout-metadata";

export const metadata: Metadata = protectedAppMetadata;

export default function ProtectedLayout({ children }: { children: ReactNode }) {
    return <ProtectedLayoutClient>{children}</ProtectedLayoutClient>;
}
