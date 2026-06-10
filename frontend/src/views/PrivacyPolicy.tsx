import { Component } from "react";

import { privacy_page_html } from "../assets/templates/privacy";

export class PrivacyPolicy extends Component {
  render() {
    var template = { __html: privacy_page_html };

    return (
      <div>
        <div
          style={{
            maxWidth: "700px",
            margin: "0 auto",
            padding: "0 1rem",
            marginTop: "5em",
            marginBottom: "10em",
          }}
        >
          <div dangerouslySetInnerHTML={template} />
        </div>
      </div>
    );
  }
}
