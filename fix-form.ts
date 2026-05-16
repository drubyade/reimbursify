import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const templateSchema = {
    fields: [
      {
        id: "basic_details",
        type: "section",
        title: "Basic Details",
        fields: [
          { id: "name", type: "text", label: "1) Name", required: true },
          { id: "emp_code", type: "text", label: "2) Emp. Code", required: true },
          { id: "pay_level", type: "text", label: "3) Pay Level" },
          { id: "designation", type: "text", label: "4) Designation" },
          { id: "department", type: "text", label: "5) Department" },
          { id: "advance_drawn", type: "number", label: "6) Advance drawn" },
          { id: "advance_date", type: "date", label: "7) Advance drawn date" },
          { id: "bank_account", type: "text", label: "8) Bank Account No. (SBI/Any other)" },
          { id: "ifsc_code", type: "text", label: "9) IFSC Code" },
        ],
      },
      {
        id: "journey_purpose",
        type: "section",
        title: "Journey Details",
        fields: [
          { id: "purpose", type: "text", label: "10) Purpose of Journey", required: true },
          { id: "budget_head", type: "text", label: "11) Budget Head" },
        ],
      },
      {
        id: "journey_performed",
        type: "section",
        title: "12) Details of journey(s) performed: Start to End",
        fields: [
          { id: "dep_date", type: "date", label: "Departure Date" },
          { id: "dep_time", type: "time", label: "Departure Time" },
          { id: "dep_place", type: "text", label: "Departure Place (From)" },
          { id: "arr_date", type: "date", label: "Arrival Date" },
          { id: "arr_time", type: "time", label: "Arrival Time" },
          { id: "arr_place", type: "text", label: "Arrival Place (To)" },
          { id: "distance_km", type: "number", label: "Distance in Kms" },
          { id: "travel_mode", type: "select", label: "Mode of Travel", options: ["Air", "Bus", "Train", "Taxi", "Auto"] },
          { id: "travel_class", type: "text", label: "Class of Travel" },
          { id: "ticket_pnr", type: "text", label: "Ticket No. / PNR No." },
          { id: "fare_amount", type: "number", label: "Fare Amount" },
        ],
      },
      {
        id: "accommodation",
        type: "section",
        title: "13) Particulars to be furnished for Accommodation Details",
        fields: [
          { id: "acc_from", type: "date", label: "Period of Stay (From)" },
          { id: "acc_to", type: "date", label: "Period of Stay (To)" },
          { id: "hotel_name", type: "text", label: "Name and Address of the Hotel/Guest House" },
          { id: "hotel_bill", type: "text", label: "Bill No." },
          { id: "hotel_days", type: "number", label: "No of Days" },
          { id: "hotel_amount", type: "number", label: "Amount paid" },
          { id: "breakfast_complementary", type: "select", label: "If Breakfast complementary in Hotel Stay, Please tick", options: ["YES", "NO"] },
        ],
      },
      {
        id: "daily_allowances",
        type: "section",
        title: "14) Daily Allowances",
        fields: [
          { id: "food_breakfast", type: "text", label: "(a) Dates Breakfast provided by Host" },
          { id: "food_lunch", type: "text", label: "(a) Dates Lunch provided by Host" },
          { id: "food_dinner", type: "text", label: "(a) Dates Dinner provided by Host" },
          { id: "da_from", type: "date", label: "(b) DA claim From" },
          { id: "da_to", type: "date", label: "(b) DA claim To" },
          { id: "da_days", type: "number", label: "(b) No. of Days" },
          { id: "leave_taken", type: "select", label: "Whether the claimant was on leave during official Tour", options: ["YES", "NO"] },
          { id: "leave_period", type: "text", label: "If yes, please mention the period of Leave" },
        ],
      },
      {
        id: "other_expenses",
        type: "section",
        title: "15) Other expenses incurred in Journey",
        fields: [
          { id: "reg_fee", type: "number", label: "1. Registration Fee for conference /Seminar" },
          { id: "visa_ins", type: "number", label: "2. Visa Fees/Insurance charges" },
          { id: "other_charges", type: "number", label: "3. Any Other Charges" },
        ],
      },
      {
        id: "undertaking",
        type: "section",
        title: "UNDERTAKING (Air Travel Only)",
        fields: [
          { id: "agent", type: "select", label: "Authorized Travel Agent Used", options: ["M/s Balmer Lawrie & Company Limited (BLCL)", "M/s Ashok Travels & Tours (ATT)", "Indian Railways Catering and Tourism Corporation ltd. (IRCTC)", "Not Applicable"] },
        ],
      }
    ],
    version: 1,
    createdAt: new Date().toISOString(),
  };

  const formTemplate = await prisma.formTemplate.findFirst({
    where: { title: "IIT Ropar TA Form" }
  });

  if (formTemplate) {
    await prisma.formTemplate.update({
      where: { id: formTemplate.id },
      data: {
        templateSchema: JSON.stringify(templateSchema)
      }
    });
    console.log("Successfully updated the schema for IIT Ropar TA Form!");
  } else {
    console.error("IIT Ropar TA Form not found in database!");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
