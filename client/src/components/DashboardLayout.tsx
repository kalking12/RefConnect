import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import SignInGate from "@/components/SignInGate";
import { useIsMobile } from "@/hooks/useMobile";
import { ClipboardList, LogOut, PanelLeft, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import BrandMark from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";

const menuItems = [
  { icon: Stethoscope, label: "Hospital search", path: "/search" },
  { icon: ClipboardList, label: "Admin portal", path: "/admin" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user } = useAuth();

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return <SignInGate />;
  }

  return (
    <SidebarProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { state, toggleSidebar, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const isCollapsed = !isMobile && state === "collapsed";
  const activeMenuItem = menuItems.find(item => item.path === location);

  return (
    <>
      <Sidebar collapsible="icon" className="border-r-0">
        <SidebarHeader
          className={
            isCollapsed ? "h-16 justify-center p-0" : "h-16 justify-center"
          }
        >
          <div
            className={`flex items-center gap-3 transition-all w-full ${isCollapsed ? "justify-center px-0" : "px-2"}`}
          >
            <button
              type="button"
              onClick={toggleSidebar}
              className="h-11 w-11 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
              aria-label={
                isMobile
                  ? "Close navigation"
                  : isCollapsed
                    ? "Expand navigation"
                    : "Collapse navigation"
              }
              aria-expanded={!isCollapsed}
            >
              <PanelLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            {!isCollapsed ? (
              <div className="flex items-center gap-2 min-w-0">
                <BrandMark className="h-7 w-7 !rounded-lg" />
                <span className="font-semibold tracking-tight truncate">
                  RefConnect
                </span>
              </div>
            ) : null}
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-0">
          <nav aria-label="Main navigation">
            <SidebarMenu className="px-2 py-1 group-data-[collapsible=icon]:px-0.5">
              {menuItems
                .filter(
                  item => item.path !== "/admin" || user?.role === "admin"
                )
                .map(item => {
                  const isActive = location === item.path;
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className="h-11 font-normal transition-colors group-data-[collapsible=icon]:size-11!"
                      >
                        <Link
                          href={item.path}
                          aria-current={isActive ? "page" : undefined}
                          onClick={() => setOpenMobile(false)}
                        >
                          <item.icon
                            className={isActive ? "text-primary" : undefined}
                            aria-hidden="true"
                          />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
            </SidebarMenu>
          </nav>
        </SidebarContent>

        <SidebarFooter className="p-3 group-data-[collapsible=icon]:p-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label={`Account menu for ${user?.name || user?.email || "your account"}`}
                className="flex min-h-11 items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar className="h-9 w-9 border shrink-0">
                  <AvatarFallback className="text-xs font-medium">
                    {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="text-sm font-medium truncate leading-none">
                    {user?.name || "Account"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-1.5">
                    {user?.email}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() =>
                  void logout().catch(() =>
                    toast.error("Sign-out failed. Reconnect and try again.")
                  )
                }
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <div className="fixed bottom-4 right-4 z-50">
          <ThemeToggle />
        </div>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background px-2 sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger
                className="h-11 w-11 rounded-lg bg-background"
                aria-label="Open navigation"
              />
              <span className="tracking-tight text-foreground">
                {activeMenuItem?.label ?? "Menu"}
              </span>
            </div>
          </div>
        )}
        <div className="flex-1 p-4">{children}</div>
      </SidebarInset>
    </>
  );
}
