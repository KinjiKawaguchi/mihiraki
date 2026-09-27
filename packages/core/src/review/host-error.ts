/** Foreseeable failures of talking to the host behind a review; the UI words them. */
export type HostError =
  | { readonly kind: "timeout" }
  | { readonly kind: "network" }
  /** The host refused the request; `detail` is its own explanation, possibly empty. */
  | { readonly kind: "rejected"; readonly detail: string }
  /** The host answered with something that could not be understood. */
  | { readonly kind: "unexpectedResponse" };
