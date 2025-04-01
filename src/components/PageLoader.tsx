import React from 'react';
import { Spinner } from 'react-bootstrap';
import { ThreeDots } from 'react-loader-spinner';

/**
 * PageLoader Component
 * 
 * A reusable loading component that can be used throughout the application.
 * 
 * Usage examples:
 * 
 * 1. Full page loader:
 * ```tsx
 * <PageLoader fullPage type="dots" color="#4fa94d" />
 * ```
 * 
 * 2. Inline loader with text:
 * ```tsx
 * <PageLoader type="spinner" size="sm" text="Loading..." />
 * ```
 * 
 * 3. Button loader:
 * ```tsx
 * <Button disabled={isLoading}>
 *   {isLoading ? (
 *     <>
 *       <PageLoader type="spinner" size="sm" className="me-2" />
 *       Loading...
 *     </>
 *   ) : (
 *     "Submit"
 *   )}
 * </Button>
 * ```
 */

type LoaderType = 'spinner' | 'dots';

interface PageLoaderProps {
  // Whether the loader takes up the full page
  fullPage?: boolean;
  // The type of loader to display
  type?: LoaderType;
  // Optional text to display below the loader
  text?: string;
  // Size of the loader (sm, md, lg)
  size?: 'sm' | 'md' | 'lg';
  // Color of the loader
  color?: string;
  // Additional CSS class names
  className?: string;
}

const PageLoader: React.FC<PageLoaderProps> = ({
  fullPage = false,
  type = 'spinner',
  text,
  size = 'md',
  color = '#007bff',
  className = '',
}) => {
  // Size mappings for different loader types
  const sizeMappings = {
    spinner: {
      sm: 'sm',
      md: '',
      lg: 'lg',
    },
    dots: {
      sm: { height: 40, width: 40 },
      md: { height: 60, width: 60 },
      lg: { height: 80, width: 80 },
    },
  };

  // Spinner size based on the size prop
  const spinnerSize = sizeMappings.spinner[size];
  
  // Dots size based on the size prop
  const dotsSize = sizeMappings.dots[size];

  // Container classes based on whether it's a full page loader
  const containerClasses = fullPage
    ? 'd-flex justify-content-center align-items-center min-vh-100'
    : className.includes('me-') ? 'd-inline-block' : 'd-flex justify-content-center align-items-center';

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className={className.includes('me-') ? '' : 'text-center'}>
        {type === 'spinner' ? (
          <Spinner
            animation="border"
            size={spinnerSize as any}
            role="status"
            style={{ color }}
            className={text ? 'mb-2' : ''}
          />
        ) : (
          <ThreeDots
            height={dotsSize.height}
            width={dotsSize.width}
            radius={9}
            color={color}
            ariaLabel="three-dots-loading"
            visible={true}
          />
        )}
        {text && <div className="mt-2">{text}</div>}
      </div>
    </div>
  );
};

export default PageLoader; 