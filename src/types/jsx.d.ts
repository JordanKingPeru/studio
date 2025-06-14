
import 'react';

// THIS FILE CAN BE CONSIDERED OBSOLETE
// The <gmp-place-autocomplete-element> Web Component is no longer used
// in favor of Place.searchByText() and manual input for city search.
// It's left here for reference or if a future decision is made to revert.

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
          value?: string; // Added to allow setting the value programmatically
          // You can add other custom attributes here as needed
        },
        HTMLElement
      >;
    }
  }
}
