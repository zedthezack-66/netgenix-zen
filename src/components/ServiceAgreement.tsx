import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

export const ServiceAgreement = () => {
  const generateAgreementPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPosition = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("SERVICE AGREEMENT", pageWidth / 2, yPosition, { align: "center" });
    
    yPosition += 15;
    doc.setFontSize(12);
    doc.text("NetGenix Business Management System", pageWidth / 2, yPosition, { align: "center" });
    
    yPosition += 20;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Agreement sections
    const sections = [
      {
        title: "1. PARTIES",
        content: "This Service Agreement (\"Agreement\") is entered into between ZEDZACK TECH (\"Provider\") and the Client (\"User\") for the provision and use of the NetGenix Business Management System (\"System\")."
      },
      {
        title: "2. SYSTEM DESCRIPTION",
        content: "The System is a comprehensive business automation platform designed for printing and embroidery businesses, including job tracking, expense management, inventory control, and automated reporting capabilities."
      },
      {
        title: "3. LICENSE GRANT",
        content: "Provider grants User a non-exclusive, non-transferable license to use the System for business operations. This license is valid as long as the User maintains active subscription payments and complies with the terms of this Agreement."
      },
      {
        title: "4. ONE-TIME DEVELOPMENT FEE",
        content: "User agrees to pay a one-time development and deployment fee of ZMW 3,000.00 (Three Thousand Zambian Kwacha). This fee covers:\n• Custom system development and configuration\n• Initial deployment and setup\n• Data migration and system integration\n• User training and onboarding\n• Testing and quality assurance\n\nThis fee is due upon signing of this Agreement or as otherwise agreed in writing between the parties."
      },
      {
        title: "5. MONTHLY SUBSCRIPTION FEES",
        content: "User agrees to pay a monthly subscription fee of ZMW 20.00 (Twenty Zambian Kwacha) for online deployment and cloud storage services hosted on AWS infrastructure. This fee covers:\n• Cloud hosting and server maintenance\n• Database storage and backups\n• System uptime and availability\n• Cloud infrastructure costs\n\nPayment is due on the first day of each month. Failure to pay within 7 days may result in service suspension."
      },
      {
        title: "6. MAINTENANCE AND SUPPORT",
        content: "Provider agrees to provide ongoing system maintenance at no additional cost, including:\n• Bug fixes and error corrections\n• Security updates and patches\n• Performance optimization\n• Technical support for existing features\n• System stability improvements"
      },
      {
        title: "7. ADDITIONAL DEVELOPMENT",
        content: "Any requests for new features, modifications, or enhancements beyond the current system capabilities will incur additional development costs. Such costs will be agreed upon in writing before any development work commences. The Provider will provide a detailed scope and cost estimate for approval."
      },
      {
        title: "8. DATA OWNERSHIP AND SECURITY",
        content: "All data entered into the System remains the sole property of the User. Provider implements industry-standard security measures to protect User data but is not liable for data loss due to circumstances beyond reasonable control."
      },
      {
        title: "9. SERVICE AVAILABILITY",
        content: "Provider will make reasonable efforts to ensure 99% system uptime. Scheduled maintenance will be communicated in advance when possible. Provider is not liable for downtime due to third-party service failures or force majeure events."
      },
      {
        title: "10. TERMINATION",
        content: "Either party may terminate this Agreement with 30 days written notice. Upon termination, User will have 30 days to export all data from the System. Outstanding fees remain due and payable."
      },
      {
        title: "11. WARRANTY DISCLAIMER",
        content: "The System is provided \"as is\" without warranties of any kind, either express or implied. Provider does not warrant that the System will meet all User requirements or operate without interruption."
      },
      {
        title: "12. LIMITATION OF LIABILITY",
        content: "Provider's total liability under this Agreement shall not exceed the total fees paid by User in the twelve months preceding any claim. Provider is not liable for indirect, incidental, or consequential damages."
      },
      {
        title: "13. INTELLECTUAL PROPERTY",
        content: "All intellectual property rights in the System, including source code, design, and documentation, remain the exclusive property of ZEDZACK TECH. User may not reverse engineer, modify, or create derivative works."
      },
      {
        title: "14. CONFIDENTIALITY",
        content: "Both parties agree to maintain confidentiality of proprietary information disclosed during the term of this Agreement and for two years thereafter."
      },
      {
        title: "15. GOVERNING LAW",
        content: "This Agreement shall be governed by and construed in accordance with applicable laws. Any disputes shall be resolved through good faith negotiation or, if necessary, binding arbitration."
      },
      {
        title: "16. ENTIRE AGREEMENT",
        content: "This Agreement constitutes the entire agreement between the parties and supersedes all prior understandings. Modifications must be made in writing and signed by both parties."
      }
    ];

    sections.forEach((section) => {
      // Check if we need a new page
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      // Section title
      doc.setFont("helvetica", "bold");
      const titleLines = doc.splitTextToSize(section.title, maxWidth);
      doc.text(titleLines, margin, yPosition);
      yPosition += titleLines.length * 7;

      // Section content
      doc.setFont("helvetica", "normal");
      const contentLines = doc.splitTextToSize(section.content, maxWidth);
      doc.text(contentLines, margin, yPosition);
      yPosition += contentLines.length * 5 + 8;
    });

    // Signature section
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }

    yPosition += 20;
    doc.setFont("helvetica", "bold");
    doc.text("ACCEPTANCE", margin, yPosition);
    yPosition += 10;
    
    doc.setFont("helvetica", "normal");
    doc.text("By using the NetGenix System, User acknowledges having read, understood, and agreed to be bound by the terms of this Agreement.", margin, yPosition, { maxWidth });
    
    yPosition += 30;
    doc.line(margin, yPosition, margin + 70, yPosition);
    doc.text("Provider Signature", margin, yPosition + 7);
    doc.text("Date: _____________", margin, yPosition + 14);

    doc.line(pageWidth - margin - 70, yPosition, pageWidth - margin, yPosition);
    doc.text("Client Signature", pageWidth - margin - 70, yPosition + 7);
    doc.text("Date: _____________", pageWidth - margin - 70, yPosition + 14);

    // Footer
    yPosition += 30;
    doc.setFontSize(8);
    doc.text("System Powered by ZEDZACK TECH", pageWidth / 2, yPosition, { align: "center" });
    doc.text("© 2025 NetGenix. All Rights Reserved.", pageWidth / 2, yPosition + 5, { align: "center" });

    // Save the PDF
    doc.save("NetGenix_Service_Agreement.pdf");
    toast.success("Service agreement downloaded successfully");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Agreement</CardTitle>
        <CardDescription>
          Download the complete service agreement including terms of use, subscription fees, and maintenance policy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="font-semibold text-sm">Agreement Highlights:</h3>
          <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
            <li>One-time development fee: <span className="font-medium text-foreground">ZMW 3,000</span> for custom development and deployment</li>
            <li>Monthly subscription: <span className="font-medium text-foreground">ZMW 20</span> for cloud hosting and storage</li>
            <li><span className="font-medium text-foreground">Free maintenance</span> and technical support included</li>
            <li>Additional development features available at agreed costs</li>
            <li>30-day notice for termination with data export rights</li>
            <li>System powered by ZEDZACK TECH</li>
          </ul>
        </div>
        
        <Button onClick={generateAgreementPDF} className="w-full">
          <Download className="mr-2 h-4 w-4" />
          Download Service Agreement (PDF)
        </Button>
      </CardContent>
    </Card>
  );
};
