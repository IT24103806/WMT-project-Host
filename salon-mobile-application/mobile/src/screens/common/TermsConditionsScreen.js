import React from "react";
import { StyleSheet, Text, View } from "react-native";
import ScreenContainer from "../../components/ScreenContainer";
import { useTheme } from "../../context/ThemeContext";
import { FONTS } from "../../constants/theme";

export default function TermsConditionsScreen() {
  const { mode } = useTheme();
  const styles = createStyles(mode);

  return (
    <ScreenContainer>
      <View style={styles.document}>
        <Text style={styles.heading}>SALON OSKI - CUSTOMER RULES & GUIDELINES</Text>

        <Text style={styles.section}>1. Respect and Cooperation</Text>
        <Text style={styles.line}>. All customers are expected to speak politely to workers and other customers.</Text>
        <Text style={styles.line}>. Disrespect, shouting, or abuse toward any staff or customer will not be tolerated.</Text>
        <Text style={styles.line}>. Wait patiently for your turn - no jumping the queue.</Text>

        <Text style={styles.section}>2. Payment Rules</Text>
        <Text style={styles.line}>. All payments must be made to the cashier or shop owner before leaving the salon.</Text>
        <Text style={styles.line}>. The shop does not allow credit or 'pay later' unless approved by the owner.</Text>
        <Text style={styles.line}>. Price lists are fixed; please confirm your service price before starting.</Text>

        <Text style={styles.section}>3. Services and Hygiene</Text>
        <Text style={styles.line}>. Customers should make sure their hair is clean or be ready to pay for washing if needed.</Text>
        <Text style={styles.line}>. The salon provides clean tools for every customer - please allow workers time to sanitize tools.</Text>
        <Text style={styles.line}>. Personal tools from customers are only allowed with the owner's approval.</Text>

        <Text style={styles.section}>4. Behavior in the Shop</Text>
        <Text style={styles.line}>. No smoking, drinking alcohol, or using abusive language inside the salon.</Text>
        <Text style={styles.line}>. Keep your phone's volume low; use earphones for calls or music.</Text>
        <Text style={styles.line}>. Please don't interfere with other customers' hairstyles or workers while they're working.</Text>

        <Text style={styles.section}>5. Appointments and Time</Text>
        <Text style={styles.line}>. Customers are encouraged to book appointments early to avoid long waiting times.</Text>
        <Text style={styles.line}>. If you come late for an appointment, you may lose your slot to another customer.</Text>

        <Text style={styles.section}>6. Complaints and Feedback</Text>
        <Text style={styles.line}>. If you are not satisfied with any service, kindly report directly to the shop owner immediately.</Text>
        <Text style={styles.line}>. We value your feedback and will always try to make things right.</Text>

        <Text style={styles.footerTitle}>Thank You for Choosing Salon Oski!</Text>
        <Text style={styles.footerText}>
          We appreciate your trust in us. Our goal is to make you look and feel your best in a clean,
          respectful, and friendly environment.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const createStyles = (mode) =>
  StyleSheet.create({
    document: {
      backgroundColor: mode === "dark" ? "#1f1f1f" : "#2a2a2a",
      borderRadius: 0,
      paddingVertical: 14,
      paddingHorizontal: 12
    },
    heading: {
      color: "#f4f4f4",
      fontFamily: FONTS.bodySemiBold,
      fontSize: 16,
      marginBottom: 20
    },
    section: {
      color: "#f4f4f4",
      fontSize: 14,
      marginBottom: 4,
      marginTop: 12,
      fontFamily: FONTS.bodyMedium
    },
    line: {
      color: "#f4f4f4",
      fontFamily: FONTS.body,
      fontSize: 14,
      lineHeight: 24
    },
    footerTitle: {
      color: "#f4f4f4",
      fontFamily: FONTS.bodyMedium,
      fontSize: 14,
      textAlign: "center",
      marginTop: 28,
      marginBottom: 12
    },
    footerText: {
      color: "#f4f4f4",
      fontFamily: FONTS.body,
      fontSize: 14,
      lineHeight: 24,
      textAlign: "center"
    }
  });
