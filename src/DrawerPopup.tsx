import * as React from 'react';
import classNames from 'classnames';
import CSSMotion from 'rc-motion';
import type { CSSMotionProps } from 'rc-motion';
import DrawerPanel from './DrawerPanel';
// import type ScrollLocker from 'rc-util/lib/Dom/scrollLocker';
import DrawerContext from './context';
import type { DrawerContextProps } from './context';
import KeyCode from 'rc-util/lib/KeyCode';
import { parseWidthHeight } from './util';

const sentinelStyle: React.CSSProperties = {
  width: 0,
  height: 0,
  overflow: 'hidden',
  outline: 'none',
  position: 'absolute',
};

export type Placement = 'left' | 'right' | 'top' | 'bottom';

export interface PushConfig {
  distance?: number | string;
}

export interface DrawerPopupProps {
  prefixCls: string;
  open?: boolean;
  inline?: boolean;
  push?: boolean | PushConfig;
  forceRender?: boolean;
  autoFocus?: boolean;
  keyboard?: boolean;

  // Root
  rootClassName?: string;
  rootStyle?: React.CSSProperties;
  zIndex?: number;

  // Drawer
  placement?: Placement;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  width?: number | string;
  height?: number | string;
  contentWrapperStyle?: React.CSSProperties;

  // Mask
  mask?: boolean;
  maskClosable?: boolean;
  maskClassName?: string;
  maskStyle?: React.CSSProperties;

  // Motion
  motion?: CSSMotionProps | ((placement: Placement) => CSSMotionProps);
  maskMotion?: CSSMotionProps;

  // Events
  afterOpenChange?: (open: boolean) => void;
  onClose?: (
    event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
  ) => void;
}

export default function DrawerPopup(props: DrawerPopupProps) {
  const {
    prefixCls,
    open,
    placement,
    inline,
    push,
    forceRender,
    autoFocus,
    keyboard,

    // Root
    rootClassName,
    rootStyle,
    zIndex,

    // Drawer
    className,
    style,
    motion,
    width,
    height,
    children,
    contentWrapperStyle,

    // Mask
    mask,
    maskClosable,
    maskMotion,
    maskClassName,
    maskStyle,

    // Events
    afterOpenChange,
    onClose,
  } = props;

  // ================================ Refs ================================
  const panelRef = React.useRef<HTMLDivElement>();
  const sentinelStartRef = React.useRef<HTMLDivElement>();
  const sentinelEndRef = React.useRef<HTMLDivElement>();

  const onPanelKeyDown: React.KeyboardEventHandler<HTMLDivElement> = event => {
    const { keyCode, shiftKey } = event;

    switch (keyCode) {
      // Tab active
      case KeyCode.TAB: {
        if (keyCode === KeyCode.TAB) {
          if (!shiftKey && document.activeElement === sentinelEndRef.current) {
            sentinelStartRef.current?.focus({ preventScroll: true });
          } else if (
            shiftKey &&
            document.activeElement === sentinelStartRef.current
          ) {
            sentinelEndRef.current?.focus({ preventScroll: true });
          }
        }
        break;
      }

      // Close
      case KeyCode.ESC: {
        if (onClose && keyboard) {
          onClose(event);
        }
        break;
      }
    }
  };

  // ========================== Control ===========================
  // Auto Focus
  React.useEffect(() => {
    if (open && autoFocus) {
      panelRef.current?.focus({ preventScroll: true });
    }
  }, [open, autoFocus]);

  // ============================ Push ============================
  const [pushed, setPushed] = React.useState(false);

  const parentContext = React.useContext(DrawerContext);

  // Merge push distance
  let pushConfig: PushConfig;
  if (push === false) {
    pushConfig = {
      distance: 0,
    };
  } else if (push === true) {
    pushConfig = {};
  } else {
    pushConfig = push || {};
  }
  const pushDistance =
    pushConfig?.distance ?? parentContext?.pushDistance ?? 180;

  const mergedContext = React.useMemo<DrawerContextProps>(
    () => ({
      pushDistance,
      push: () => {
        setPushed(true);
      },
      pull: () => {
        setPushed(false);
      },
    }),
    [pushDistance],
  );

  // ========================= ScrollLock =========================
  // Tell parent to push
  React.useEffect(() => {
    if (open) {
      parentContext?.push?.();
    } else {
      parentContext?.pull?.();
    }
  }, [open]);

  // Clean up
  React.useEffect(
    () => () => {
      parentContext?.pull?.();
    },
    [],
  );

  // ============================ Mask ============================
  const maskNode: React.ReactNode = mask && (
    <CSSMotion key="mask" {...maskMotion} visible={open}>
      {(
        { className: motionMaskClassName, style: motionMaskStyle },
        maskRef,
      ) => {
        return (
          <div
            className={classNames(
              `${prefixCls}-mask`,
              motionMaskClassName,
              maskClassName,
            )}
            style={{
              ...motionMaskStyle,
              ...maskStyle,
            }}
            onClick={maskClosable ? onClose : undefined}
            ref={maskRef}
          />
        );
      }}
    </CSSMotion>
  );

  // =========================== Panel ============================
  const motionProps = typeof motion === 'function' ? motion(placement) : motion;

  const wrapperStyle: React.CSSProperties = {};

  if (pushed && pushDistance) {
    switch (placement) {
      case 'top':
        wrapperStyle.transform = `translateY(${pushDistance}px)`;
        break;
      case 'bottom':
        wrapperStyle.transform = `translateY(${-pushDistance}px)`;
        break;
      case 'left':
        wrapperStyle.transform = `translateX(${pushDistance}px)`;

        break;
      default:
        wrapperStyle.transform = `translateX(${-pushDistance}px)`;
        break;
    }
  }

  if (placement === 'left' || placement === 'right') {
    wrapperStyle.width = parseWidthHeight(width);
  } else {
    wrapperStyle.height = parseWidthHeight(height);
  }

  const panelNode: React.ReactNode = (
    <CSSMotion
      key="panel"
      {...motionProps}
      visible={open}
      forceRender={forceRender}
      onVisibleChanged={nextVisible => {
        afterOpenChange?.(nextVisible);
      }}
      removeOnLeave={false}
      leavedClassName={`${prefixCls}-content-wrapper-hidden`}
    >
      {({ className: motionClassName, style: motionStyle }, motionRef) => {
        return (
          <div
            className={classNames(
              `${prefixCls}-content-wrapper`,
              motionClassName,
            )}
            style={{
              ...wrapperStyle,
              ...motionStyle,
              ...contentWrapperStyle,
            }}
          >
            <DrawerPanel
              containerRef={motionRef}
              prefixCls={prefixCls}
              className={className}
              style={style}
            >
              {children}
            </DrawerPanel>
          </div>
        );
      }}
    </CSSMotion>
  );

  // =========================== Render ===========================
  const containerStyle: React.CSSProperties = {
    ...rootStyle,
  };

  if (zIndex) {
    containerStyle.zIndex = zIndex;
  }

  return (
    <DrawerContext.Provider value={mergedContext}>
      <div
        className={classNames(
          prefixCls,
          `${prefixCls}-${placement}`,
          rootClassName,
          {
            [`${prefixCls}-open`]: open,
            [`${prefixCls}-inline`]: inline,
          },
        )}
        style={containerStyle}
        tabIndex={-1}
        ref={panelRef}
        onKeyDown={onPanelKeyDown}
      >
        {maskNode}
        <div
          tabIndex={0}
          ref={sentinelStartRef}
          style={sentinelStyle}
          aria-hidden="true"
          data-sentinel="start"
        />
        {panelNode}
        <div
          tabIndex={0}
          ref={sentinelEndRef}
          style={sentinelStyle}
          aria-hidden="true"
          data-sentinel="end"
        />
      </div>
    </DrawerContext.Provider>
  );
}
