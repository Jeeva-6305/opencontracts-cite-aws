import React, { useState } from "react";
import { ModelFieldBuilder } from "../src/components/widgets/ModelFieldBuilder";

interface FieldType {
  fieldName: string;
  fieldType: string;
  id: string;
}

export const ModelFieldBuilderTestWrapper: React.FC<{
  initialFields?: FieldType[];
}> = ({ initialFields }) => {
  const [fields, setFields] = useState<FieldType[]>(initialFields || []);

  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <ModelFieldBuilder
        onFieldsChange={setFields}
        initialFields={initialFields}
      />
      <span
        data-testid="field-count"
        style={{ position: "absolute", left: -9999 }}
      >
        {fields.length}
      </span>
    </div>
  );
};
