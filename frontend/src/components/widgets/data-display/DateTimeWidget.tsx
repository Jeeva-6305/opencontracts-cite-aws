export function DateTimeWidget({
  timeString,
  dateString,
}: {
  timeString: string;
  dateString: string;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "1rem", fontWeight: 600 }}>{timeString}</div>
      <div
        style={{
          fontSize: "0.75rem",
          color: "rgba(0,0,0,0.6)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {dateString}
      </div>
    </div>
  );
}
