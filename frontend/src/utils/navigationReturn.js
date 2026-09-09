export const RETURN_TO = {
  PENDING_REQUESTS: "PendingRequests",
};

export function withReturnTo(params = {}, returnTo) {
  if (!returnTo) return params;
  return { ...params, returnTo };
}

export function resolveReturnTo(returnTo, { fromServiceFlow } = {}) {
  if (returnTo) return returnTo;
  if (fromServiceFlow) return RETURN_TO.PENDING_REQUESTS;
  return null;
}

export function navigateBack(navigation, returnTo) {
  if (returnTo === RETURN_TO.PENDING_REQUESTS) {
    navigation.navigate(RETURN_TO.PENDING_REQUESTS);
    return;
  }
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  navigation.navigate("UserDashboard");
}
