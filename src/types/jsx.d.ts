
import 'react';

// Augment the JSX namespace to include the custom Google Maps element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gmp-place-autocomplete-element': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          // Define the specific properties for the custom element
          // The attribute must be a string, so we type it as such.
          'request-options'?: string;
          placeholder?: string;
          // You can add other custom attributes here as needed
        },
        HTMLElement
      >;
    }
  }
}
