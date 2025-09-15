import type { FC, PropsWithChildren } from "react";

import { DashboardLayoutUI } from "@/ui/layout/dashboard-layout";

const DashboardLayout: FC<PropsWithChildren> = ({ children }) => (
  <DashboardLayoutUI>{children}</DashboardLayoutUI>
);

export default DashboardLayout;
