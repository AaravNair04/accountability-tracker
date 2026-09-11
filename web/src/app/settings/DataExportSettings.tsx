export default function DataExportSettings() {
  const linkStyle = {
    display:
      "inline-block",

    padding:
      "10px 14px",

    border:
      "1px solid #333",

    borderRadius:
      "6px",

    textDecoration:
      "none",

    color:
      "inherit"
  };

  return (
    <section
      style={{
        marginTop:
          "32px"
      }}
    >

      <h2>
        Data export
      </h2>


      <p>
        Download your usage sessions, reports,
        devices, tracked sites, and accountability
        records.
      </p>


      <div
        style={{
          display:
            "flex",

          flexWrap:
            "wrap",

          gap:
            "10px"
        }}
      >
        <a
          href="/api/export?format=json"
          style={linkStyle}
        >
          Download full JSON
        </a>

        <a
          href="/api/export?format=csv&dataset=usage-sessions"
          style={linkStyle}
        >
          Usage sessions CSV
        </a>

        <a
          href="/api/export?format=csv&dataset=daily-reports"
          style={linkStyle}
        >
          Daily reports CSV
        </a>
      </div>

    </section>
  );
}
