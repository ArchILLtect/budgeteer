import { forwardRef, type ReactNode } from "react";
import { NavLink, type NavLinkProps, useNavigate } from "react-router-dom";
import { useRouteLoadingStore } from "../store/routeLoadingStore";

type RenderArgs = { isActive: boolean; isPending: boolean };
type Child = ReactNode | ((args: RenderArgs) => ReactNode);

export type RouterLinkProps = Omit<NavLinkProps, "children"> & {
  children: Child;
};

export const RouterLink = forwardRef<HTMLAnchorElement, RouterLinkProps>(
  ({ children, onClick, replace, state, preventScrollReset, relative, viewTransition, ...props }, ref) => {
    const navigate = useNavigate();
    const startRouteLoading = useRouteLoadingStore((s) => s.startRouteLoading);

    return (
      <NavLink
        ref={ref}
        {...props}
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented) return;

          // Let the browser handle new-tab and modified clicks.
          if (e.button !== 0) return;
          if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return;
          if (props.target === "_blank") return;

          e.preventDefault();

          // Paint loading UI urgently, then navigate as a transition so heavy routes
          // don't block the loading overlay from appearing.
          const dest = typeof props.to === "string" ? props.to : null;
          startRouteLoading(dest);
          navigate(props.to, {
            replace,
            state,
            preventScrollReset,
            relative,
            viewTransition,
          });
        }}
        style={{ textDecoration: "none", ...(props.style ?? {}) }}
      >
        {(args) => (typeof children === "function" ? children(args) : children)}
      </NavLink>
    );
  }
);

RouterLink.displayName = "RouterLink";