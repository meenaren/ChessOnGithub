# Resign Functionality Monitoring Plan

This document outlines the monitoring plan for the "Resign" button functionality as specified in [`specifications/07_resign_functionality_spec.md`](../../specifications/07_resign_functionality_spec.md) and documented in [`docs/features/7_resign_functionality.md`](../features/7_resign_functionality.md).

## 1. Key Metrics

The following key metrics will be tracked to understand the usage and performance of the resign functionality:

*   **Resignation Frequency:**
    *   **Metric:** Count of successful resignations.
    *   **Tracking Point:** Successful execution of [`handleConfirmResign()`](../../src/App.tsx:413) in [`src/App.tsx`](../../src/App.tsx:1).
    *   **Dimension:** Overall, per player (if user IDs are available).
*   **Resignation Confirmation Rate:**
    *   **Metric:** Ratio of confirmed resignations to initiated resignations.
    *   **Tracking Points:**
        *   Initiation: [`handleResignClick()`](../../src/components/NavBar.tsx:90) in [`src/components/NavBar.tsx`](../../src/components/NavBar.tsx:1).
        *   Confirmation: Successful call to `onResignConfirm` from [`handleCloseResignDialog(true)`](../../src/components/NavBar.tsx:94) in [`src/components/NavBar.tsx`](../../src/components/NavBar.tsx:1).
        *   Cancellation: Call to [`handleCloseResignDialog(false)`](../../src/components/NavBar.tsx:94).
*   **P2P Resignation Message Success Rate:**
    *   **Metric:** Percentage of `RESIGN` P2P messages successfully sent and acknowledged/processed by the opponent.
    *   **Tracking Points:**
        *   Sent: After `sendGameData()` for a `RESIGN` message in [`handleConfirmResign()`](../../src/App.tsx:413).
        *   Received & Processed: Successful execution of [`gameLogic.handleResignation()`](../../src/modules/gameLogic.ts:157) triggered by an incoming `RESIGN` message (see [`src/App.tsx:168-182`](../../src/App.tsx:168)).
*   **Error Rate for Resignation Process:**
    *   **Metric:** Number/percentage of errors occurring during the resignation flow.
    *   **Tracking Points:**
        *   Failures in sending P2P `RESIGN` message (e.g., error callback of `sendGameData()`).
        *   Errors during the execution of [`gameLogic.handleResignation()`](../../src/modules/gameLogic.ts:157) on either player's client.
        *   Any unexpected errors caught within [`handleConfirmResign()`](../../src/App.tsx:413) or the opponent's `RESIGN` message handling logic.

## 2. Logging

Detailed logging will be implemented to capture the lifecycle of a resignation event. Logs should be structured (e.g., JSON) and include common fields like `timestamp`, `gameId`, `userId` (or `localPlayerColor`), `correlationId`.

### Events to Log:

*   **`RESIGN_INITIATED`**:
    *   Trigger: [`handleResignClick()`](../../src/components/NavBar.tsx:90) in [`src/components/NavBar.tsx`](../../src/components/NavBar.tsx:1).
    *   Details: `userId`, `gameId`.
*   **`RESIGN_CONFIRMED`**:
    *   Trigger: `onResignConfirm` called from [`handleCloseResignDialog(true)`](../../src/components/NavBar.tsx:94) (leading to [`handleConfirmResign()`](../../src/App.tsx:413)).
    *   Details: `userId`, `gameId`, `resigningPlayerColor`.
*   **`RESIGN_CANCELLED`**:
    *   Trigger: [`handleCloseResignDialog(false)`](../../src/components/NavBar.tsx:94).
    *   Details: `userId`, `gameId`.
*   **`RESIGN_P2P_MSG_CREATE`**:
    *   Trigger: [`p2pService.createResignMessage()`](../../src/modules/p2pService.ts:113) called within [`handleConfirmResign()`](../../src/App.tsx:413).
    *   Details: `userId`, `gameId`, `resigningPlayerColor`, `messagePayload` (excluding sensitive P2P details).
*   **`RESIGN_P2P_MSG_SEND_ATTEMPT`**:
    *   Trigger: `sendGameData()` called for `RESIGN` message in [`handleConfirmResign()`](../../src/App.tsx:413).
    *   Details: `userId`, `gameId`, `resigningPlayerColor`.
*   **`RESIGN_P2P_MSG_SEND_SUCCESS`**:
    *   Trigger: Successful completion of `sendGameData()` for `RESIGN` message.
    *   Details: `userId`, `gameId`, `resigningPlayerColor`.
*   **`RESIGN_P2P_MSG_SEND_FAILURE`**:
    *   Trigger: Failure of `sendGameData()` for `RESIGN` message.
    *   Details: `userId`, `gameId`, `resigningPlayerColor`, `errorMessage`, `errorStack` (if available). (Ref: Spec `LOG_ERROR("Failed to send resignation notification: " + error)`)
*   **`RESIGN_LOCAL_STATE_UPDATE`**:
    *   Trigger: After [`gameLogic.handleResignation()`](../../src/modules/gameLogic.ts:157) is called in [`handleConfirmResign()`](../../src/App.tsx:413).
    *   Details: `userId`, `gameId`, `resigningPlayerColor`, `newAppStatus`, `winner`.
*   **`RESIGN_P2P_MSG_RECEIVED`**:
    *   Trigger: Opponent's client receives `P2PMessageKeyEnum.RESIGN` message (see [`src/App.tsx:168-182`](../../src/App.tsx:168)).
    *   Details: `recipientUserId`, `gameId`, `payload.resigningPlayerColor`, `payload.timestamp`.
*   **`RESIGN_OPPONENT_STATE_UPDATE`**:
    *   Trigger: After [`gameLogic.handleResignation()`](../../src/modules/gameLogic.ts:157) is called on opponent's client due to received `RESIGN` message.
    *   Details: `recipientUserId`, `gameId`, `resigningPlayerColor`, `newAppStatus`, `winner`.
*   **`RESIGN_FLOW_ERROR`**:
    *   Trigger: Any unexpected error during the resignation process not covered by `RESIGN_P2P_MSG_SEND_FAILURE`.
    *   Details: `userId`, `gameId`, `errorContext` (e.g., "gameLogic.handleResignation"), `errorMessage`, `errorStack`.

## 3. Alerting

Alerts will be configured to notify the development team of critical issues:

*   **High Resignation P2P Send Failure Rate:**
    *   Condition: Percentage of `RESIGN_P2P_MSG_SEND_FAILURE` events exceeds X% over Y minutes.
    *   Severity: Critical.
*   **Spike in `RESIGN_FLOW_ERROR` Events:**
    *   Condition: Number of `RESIGN_FLOW_ERROR` events (particularly from [`gameLogic.handleResignation()`](../../src/modules/gameLogic.ts:157)) exceeds Z over Y minutes.
    *   Severity: Critical.
*   **Significant Mismatch in Sent/Received Resignation Messages:**
    *   Condition: If `RESIGN_P2P_MSG_SEND_SUCCESS` count significantly outnumbers `RESIGN_P2P_MSG_RECEIVED` count over a defined period (e.g., 1 hour), indicating potential widespread message loss. This requires centralized log analysis.
    *   Severity: Warning/Critical depending on magnitude.
*   **Anomalous Resignation Frequency:**
    *   Condition: The overall `RESIGN_CONFIRMED` rate deviates significantly (e.g., +/- 3 standard deviations) from the historical baseline over a 24-hour period. This could indicate a bug making resignation too easy/hard or another underlying issue.
    *   Severity: Warning.

## 4. User Feedback

Mechanisms for collecting and reviewing user feedback on the resign feature:

*   **In-App Feedback:** If an in-app feedback mechanism exists, ensure there's a category for "Game Features" or "Gameplay Issues" where users can report problems with resignation.
*   **Community Channels:** Monitor official forums, Discord servers, or other community platforms for mentions of resignation issues.
*   **Support Tickets:** Track support tickets related to game endings, resignations, or unexpected game states.
*   **Review Process:** Establish a regular (e.g., weekly) review of collected feedback by the product and development teams to identify recurring issues or areas for improvement related to the resign functionality.

## 5. Tools & Techniques

*   **Log Aggregation Platform (e.g., ELK Stack, Splunk, Grafana Loki, Datadog):**
    *   To collect, store, and analyze all logs defined in Section 2.
    *   Enable searching, dashboarding, and alerting based on log data.
*   **Error Tracking Service (e.g., Sentry, Bugsnag):**
    *   To capture client-side errors, including those related to P2P communication failures or issues within the game logic during resignation.
    *   Provides detailed error reports with stack traces.
*   **Analytics Platform (e.g., Mixpanel, Amplitude):**
    *   To track key metrics like Resignation Frequency and Confirmation Rate.
    *   To visualize funnels (e.g., Resign Clicked -> Confirmed vs. Cancelled).
*   **Monitoring Dashboards (e.g., Grafana, Kibana, built-in tool dashboards):**
    *   Visualize trends for key metrics (Section 1).
    *   Display error rates and alert statuses.
    *   Track P2P message success rates for resignations.