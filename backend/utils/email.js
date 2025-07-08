const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendEmail = async ({ to, subject, html }) => {
  try {
    await resend.emails.send({
      from: "noreply@song-rec.me",
      to,
      subject,
      html,
    });
  } catch (error) {
    console.err("Email sending failed", error);
    throw error;
  }
};
