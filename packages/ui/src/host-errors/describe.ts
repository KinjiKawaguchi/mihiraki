import type { HostError } from "@mihiraki/core";
import { errorMessage } from "../format";
import type { LoadFailure } from "./load-failure";

/**
 * `what` failed (e.g. "docs/a.md を読み込めませんでした"), followed by why, as the
 * reviewer should read it.
 */
export function describeHostFailure(what: string, error: HostError): string {
  switch (error.kind) {
    case "rejected":
      return error.detail ? `${what}（${error.detail}）。` : `${what}。`;
    case "timeout":
      return `${what}。応答がありませんでした。時間をおいて再度お試しください。`;
    case "network":
      return `${what}。通信できませんでした。ネットワーク接続を確認してください。`;
    case "unexpectedResponse":
      return `${what}。応答を解釈できませんでした。サインインが切れているか、拡張機能が対応していない変更が入った可能性があります。`;
  }
}

export function describeLoadFailure(what: string, failure: LoadFailure): string {
  return failure.kind === "host"
    ? describeHostFailure(what, failure.error)
    : `${what}。${errorMessage(failure.error)}`;
}
