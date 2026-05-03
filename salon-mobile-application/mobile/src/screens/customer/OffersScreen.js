import React from "react";
import ScreenContainer from "../../components/ScreenContainer";
import EmptyState from "../../components/EmptyState";

export default function OffersScreen() {
  return (
    <ScreenContainer>
      <EmptyState
        title="No offers at the moment"
        subtitle="Please check again later for new everyday value offers."
      />
    </ScreenContainer>
  );
}

