import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { colors } from "../../constants/theme";
import {
  extractPaystackReference,
  isPaystackCallbackUrl,
  isPaystackCancelledUrl,
} from "../../services/paymentService";

export default function PaystackWebViewModal({
  visible,
  checkoutUrl,
  callbackUrl,
  onSuccess,
  onCancel,
}) {
  const handledRef = useRef(false);

  useEffect(() => {
    if (visible) handledRef.current = false;
  }, [visible, checkoutUrl]);

  const finish = (type, reference) => {
    if (handledRef.current) return;
    handledRef.current = true;
    if (type === "success") {
      onSuccess?.(reference);
    } else {
      onCancel?.();
    }
  };

  const handleUrl = (url) => {
    if (!isPaystackCallbackUrl(url, callbackUrl)) return false;
    if (isPaystackCancelledUrl(url)) {
      finish("cancel");
      return true;
    }
    const reference = extractPaystackReference(url);
    if (reference) {
      finish("success", reference);
      return true;
    }
    return false;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={() => finish("cancel")}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Paystack Checkout</Text>
          <TouchableOpacity
            onPress={() => finish("cancel")}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.close}>Close</Text>
          </TouchableOpacity>
        </View>
        {checkoutUrl ? (
          <WebView
            source={{ uri: checkoutUrl }}
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            originWhitelist={["*"]}
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
            onNavigationStateChange={(navState) => {
              if (navState?.url) handleUrl(navState.url);
            }}
            onShouldStartLoadWithRequest={(request) => {
              if (handleUrl(request.url)) return false;
              return true;
            }}
          />
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, paddingTop: 48 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 16, fontWeight: "700", color: colors.text },
  close: { fontSize: 15, fontWeight: "600", color: colors.primary },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
});
