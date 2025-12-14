import { Staff } from "@/types/staff";
import { Client } from "@/types/client";
import { Issue } from "@/types/issue";
import { Appointment } from "@/types/appointment";
import { format, subMonths, subDays, addDays, addHours, setHours, setMinutes } from "date-fns";
import { mockMembers } from "@/features/dashboard/pages/members/data/mock-members";

// Helper function to generate month string
const getMonthString = (monthsAgo: number) => {
  return format(subMonths(new Date(), monthsAgo), "yyyy-MM");
};

// Mock Staff Data
export const mockStaff: Staff[] = [
  // Personal Trainers
  {
    _id: "1",
    name: "John Smith",
    department: "PT",
    level: "Master",
    status: "AVAILABLE",
    hireDate: new Date("2023-01-15"),
    monthlySaleTarget: 3900,
    monthlyConductTarget: 120,
    phone: "+1 234-567-8900",
    email: "john.smith@theplace.com",
    staffID: "000000001",
    dateOfBirth: new Date("1990-05-15"),
    address: "123 Main Street, Phnom Penh, Cambodia",
    emergencyPhoneName: "Jane Smith",
    emergencyPhone: "+1 234-567-8999",
    shift: "AM",
    dayOff: "Sunday",
    commissionPercentage: 60,
    bio: "Certified personal trainer with 10+ years of experience specializing in strength training and rehabilitation.",
  },
  {
    _id: "2",
    name: "Sarah Johnson",
    department: "PT",
    level: "Senior",
    status: "AVAILABLE",
    hireDate: new Date("2023-03-20"),
    monthlySaleTarget: 3000,
    monthlyConductTarget: 100,
    phone: "+1 234-567-8901",
    email: "sarah.johnson@theplace.com",
    staffID: "000000002",
    dateOfBirth: new Date("1992-08-22"),
    address: "456 Oak Avenue, Phnom Penh, Cambodia",
    emergencyPhoneName: "Mark Johnson",
    emergencyPhone: "+1 234-567-8998",
    shift: "MID",
    dayOff: "Monday",
    commissionPercentage: 50,
    bio: "Fitness enthusiast and certified trainer focusing on functional movement and weight loss programs.",
  },
  {
    _id: "3",
    name: "Mike Chen",
    department: "PT",
    level: "Junior",
    status: "ON_LEAVE_SICK",
    hireDate: new Date("2025-01-10"),
    monthlySaleTarget: 2200,
    monthlyConductTarget: 80,
    phone: "+1 234-567-8902",
    email: "mike.chen@theplace.com",
    staffID: "000000003",
    dateOfBirth: new Date("1995-03-10"),
    address: "789 Pine Road, Phnom Penh, Cambodia",
    emergencyPhoneName: "Lisa Chen",
    emergencyPhone: "+1 234-567-8997",
    shift: "NOON",
    dayOff: "Tuesday",
    commissionPercentage: 40,
    bio: "New trainer passionate about helping clients achieve their fitness goals through personalized training programs.",
  },
  {
    _id: "4",
    name: "David Lee",
    department: "PT",
    level: "Senior",
    status: "DAY_OFF",
    hireDate: new Date("2023-06-12"),
    monthlySaleTarget: 3000,
    monthlyConductTarget: 100,
    phone: "+1 234-567-8903",
    email: "david.lee@theplace.com",
    staffID: "000000004",
    dateOfBirth: new Date("1988-11-30"),
    address: "321 Elm Street, Phnom Penh, Cambodia",
    emergencyPhoneName: "Susan Lee",
    emergencyPhone: "+1 234-567-8996",
    shift: "AM",
    dayOff: "Wednesday",
    commissionPercentage: 50,
    bio: "Experienced trainer specializing in sports performance and athletic conditioning.",
  },
  // PT Supervisor
  {
    _id: "5",
    name: "Emma Wilson",
    department: "PTS",
    level: "Master",
    status: "AVAILABLE",
    hireDate: new Date("2022-08-01"),
    monthlySaleTarget: 4500,
    monthlyConductTarget: 140,
    phone: "+1 234-567-8904",
    email: "emma.wilson@theplace.com",
    staffID: "000000005",
    dateOfBirth: new Date("1985-07-18"),
    address: "654 Maple Drive, Phnom Penh, Cambodia",
    emergencyPhoneName: "Robert Wilson",
    emergencyPhone: "+1 234-567-8995",
    shift: "MID",
    dayOff: "Thursday",
    commissionPercentage: 65,
    bio: "Senior trainer and supervisor with expertise in program development and team leadership.",
  },
  // Fitness Consultants
  {
    _id: "6",
    name: "Alex Rodriguez",
    department: "FC",
    status: "AVAILABLE",
    hireDate: new Date("2023-09-15"),
    monthlySaleTarget: 2800,
    phone: "+1 234-567-8905",
    email: "alex.rodriguez@theplace.com",
    staffID: "000000006",
    dateOfBirth: new Date("1991-04-25"),
    address: "987 Cedar Lane, Phnom Penh, Cambodia",
    emergencyPhoneName: "Maria Rodriguez",
    emergencyPhone: "+1 234-567-8994",
    shift: "AM",
    dayOff: "Friday",
    bio: "Fitness consultant helping clients find the perfect membership and training programs.",
  },
  {
    _id: "7",
    name: "Lisa Park",
    department: "FC",
    status: "ON_LEAVE_ANNUAL",
    hireDate: new Date("2025-02-01"),
    monthlySaleTarget: 2500,
    phone: "+1 234-567-8906",
    email: "lisa.park@theplace.com",
    staffID: "000000007",
    dateOfBirth: new Date("1993-09-12"),
    address: "147 Birch Boulevard, Phnom Penh, Cambodia",
    emergencyPhoneName: "Kevin Park",
    emergencyPhone: "+1 234-567-8993",
    shift: "MID",
    dayOff: "Saturday",
    bio: "Dedicated fitness consultant with a passion for helping people start their fitness journey.",
  },
  // FC Supervisor
  {
    _id: "8",
    name: "Robert Kim",
    department: "FCS",
    status: "AVAILABLE",
    hireDate: new Date("2022-11-20"),
    monthlySaleTarget: 3500,
    phone: "+1 234-567-8907",
    email: "robert.kim@theplace.com",
    staffID: "000000008",
    dateOfBirth: new Date("1987-12-05"),
    address: "258 Spruce Court, Phnom Penh, Cambodia",
    emergencyPhoneName: "Jennifer Kim",
    emergencyPhone: "+1 234-567-8992",
    shift: "NOON",
    dayOff: "Sunday",
    bio: "Supervisor with extensive experience in sales and customer relationship management.",
  },
  // Customer Care
  {
    _id: "9",
    name: "Jessica Brown",
    department: "CC",
    status: "AVAILABLE",
    hireDate: new Date("2023-12-01"),
    phone: "+1 234-567-8908",
    email: "jessica.brown@theplace.com",
    staffID: "000000009",
    dateOfBirth: new Date("1994-06-20"),
    address: "369 Willow Way, Phnom Penh, Cambodia",
    emergencyPhoneName: "Daniel Brown",
    emergencyPhone: "+1 234-567-8991",
    shift: "AM",
    dayOff: "Monday",
    bio: "Customer care specialist ensuring excellent service and member satisfaction.",
  },
  {
    _id: "10",
    name: "Michael Taylor",
    department: "CC",
    status: "ON_LEAVE_PUBLIC_HOLIDAY",
    hireDate: new Date("2025-01-15"),
    phone: "+1 234-567-8909",
    email: "michael.taylor@theplace.com",
    staffID: "000000010",
    dateOfBirth: new Date("1996-01-08"),
    address: "741 Ash Street, Phnom Penh, Cambodia",
    emergencyPhoneName: "Emily Taylor",
    emergencyPhone: "+1 234-567-8990",
    shift: "MID",
    dayOff: "Tuesday",
    bio: "Friendly customer care representative dedicated to helping members with their needs.",
  },
  // CC Supervisor
  {
    _id: "11",
    name: "Amanda White",
    department: "CCS",
    status: "AVAILABLE",
    hireDate: new Date("2022-05-10"),
    phone: "+1 234-567-8910",
    email: "amanda.white@theplace.com",
    staffID: "000000011",
    dateOfBirth: new Date("1989-10-15"),
    address: "852 Poplar Place, Phnom Penh, Cambodia",
    emergencyPhoneName: "Christopher White",
    emergencyPhone: "+1 234-567-8989",
    shift: "NOON",
    dayOff: "Wednesday",
    bio: "Customer care supervisor managing the front desk team and ensuring smooth operations.",
  },
  // Club Manager
  {
    _id: "15",
    name: "Jennifer Davis",
    department: "CM",
    status: "AVAILABLE",
    hireDate: new Date("2021-01-01"),
    phone: "+1 234-567-8914",
    email: "jennifer.davis@theplace.com",
    staffID: "000000015",
    dateOfBirth: new Date("1983-09-30"),
    address: "468 Redwood Drive, Phnom Penh, Cambodia",
    emergencyPhoneName: "Michael Davis",
    emergencyPhone: "+1 234-567-8985",
    shift: "AM",
    dayOff: "Sunday",
    bio: "Club manager with extensive experience in fitness facility operations and team management.",
  },
  // Assistant Manager
  {
    _id: "16",
    name: "Thomas Moore",
    department: "ASM",
    status: "AVAILABLE",
    hireDate: new Date("2022-09-01"),
    phone: "+1 234-567-8915",
    email: "thomas.moore@theplace.com",
    staffID: "000000016",
    dateOfBirth: new Date("1984-07-07"),
    address: "579 Sequoia Street, Phnom Penh, Cambodia",
    emergencyPhoneName: "Linda Moore",
    emergencyPhone: "+1 234-567-8984",
    shift: "MID",
    dayOff: "Monday",
    bio: "Assistant manager supporting daily operations and staff coordination.",
  },
];

// Mock Clients Data
export const mockClients: Client[] = [
  {
    _id: "1",
    name: "Alice Williams",
    receiptNo: "RCP-001",
    assignedStaffId: "1",
    currentSessionBalance: 12,
    packageValue: 1200,
    status: "ACTIVE",
    phone: "+1 234-567-9000",
    email: "alice@example.com",
    lastSessionDate: new Date(),
  },
  {
    _id: "2",
    name: "Bob Martinez",
    receiptNo: "RCP-002",
    assignedStaffId: "2",
    currentSessionBalance: 8,
    packageValue: 800,
    status: "ACTIVE",
    phone: "+1 234-567-9001",
    email: "bob@example.com",
    lastSessionDate: new Date(Date.now() - 86400000),
  },
  {
    _id: "3",
    name: "Carol Davis",
    receiptNo: "RCP-003",
    assignedStaffId: "1",
    currentSessionBalance: 5,
    packageValue: 600,
    status: "PAUSED",
    phone: "+1 234-567-9002",
    email: "carol@example.com",
  },
];

// Mock Issues Data
export const mockIssues: Issue[] = [
  {
    _id: "1",
    month: new Date().toISOString().slice(0, 7),
    week: 1,
    title: "Low Check-In Week 1",
    description: "Several clients missed their scheduled sessions this week.",
    category: "Low Check-In",
    ownerId: "1",
    status: "OPEN",
  },
];

// Mock Appointments Data
export const mockAppointments: Appointment[] = (() => {
  const today = new Date();
  const year = today.getFullYear();
  const appointments: Appointment[] = [];
  let appointmentCounter = 1;
  
  // Helper to generate appointment number
  const generateAppointmentNumber = () => {
    return `APT-${year}-${(appointmentCounter++).toString().padStart(5, "0")}`;
  };
  
  // Helper to get member by index (cycling through available members)
  const getMember = (index: number) => {
    return mockMembers[index % mockMembers.length];
  };

  // Add completed appointments for the past few weeks
  // Member 0 - PT Package ID "1" (10 Sessions)
  const member0 = getMember(0);
  for (let i = 1; i <= 5; i++) {
    const appointmentDate = subDays(today, i * 2);
    appointments.push({
      _id: `apt-completed-0-${i}`,
      appointmentNumber: generateAppointmentNumber(),
      clientId: member0.id,
      clientName: member0.fullName,
      staffId: "1",
      staffName: "John Smith",
      date: setHours(setMinutes(appointmentDate, 0), 10 + (i % 3)),
      time: `${(10 + (i % 3)).toString().padStart(2, "0")}:00`,
      duration: 60,
      type: "PT Session",
      status: "COMPLETED",
      notes: "Session completed successfully",
      ptPackageRecordId: "1",
    });
  }

  // Member 1 - PT Package ID "2" (5 Sessions)
  const member1 = getMember(1);
  for (let i = 1; i <= 3; i++) {
    const appointmentDate = subDays(today, i * 3);
    appointments.push({
      _id: `apt-completed-1-${i}`,
      appointmentNumber: generateAppointmentNumber(),
      clientId: member1.id,
      clientName: member1.fullName,
      staffId: "2",
      staffName: "Sarah Johnson",
      date: setHours(setMinutes(appointmentDate, 0), 14 + (i % 2)),
      time: `${(14 + (i % 2)).toString().padStart(2, "0")}:00`,
      duration: 60,
      type: "PT Session",
      status: "COMPLETED",
      notes: "Great progress today",
      ptPackageRecordId: "2",
    });
  }

  // Member 2 - PT Package ID "3" (20 Sessions)
  const member2 = getMember(2);
  for (let i = 1; i <= 8; i++) {
    const appointmentDate = subDays(today, i * 2);
    appointments.push({
      _id: `apt-completed-2-${i}`,
      appointmentNumber: generateAppointmentNumber(),
      clientId: member2.id,
      clientName: member2.fullName,
      staffId: "1",
      staffName: "John Smith",
      date: setHours(setMinutes(appointmentDate, 0), 9 + (i % 4)),
      time: `${(9 + (i % 4)).toString().padStart(2, "0")}:00`,
      duration: 60,
      type: "PT Session",
      status: "COMPLETED",
      notes: "Intense workout completed",
      ptPackageRecordId: "3",
    });
  }

  // Member 3 - PT Package ID "4" (30 Sessions)
  const member3 = getMember(3);
  for (let i = 1; i <= 12; i++) {
    const appointmentDate = subDays(today, i * 2);
    appointments.push({
      _id: `apt-completed-3-${i}`,
      appointmentNumber: generateAppointmentNumber(),
      clientId: member3.id,
      clientName: member3.fullName,
      staffId: "2",
      staffName: "Sarah Johnson",
      date: setHours(setMinutes(appointmentDate, 0), 11 + (i % 3)),
      time: `${(11 + (i % 3)).toString().padStart(2, "0")}:00`,
      duration: 60,
      type: "PT Session",
      status: "COMPLETED",
      notes: "Excellent session",
      ptPackageRecordId: "4",
    });
  }

  // Yesterday's completed appointment (to show in recent completed)
  const yesterday = subDays(today, 1);
  appointments.push(
    {
      _id: "apt-0",
      appointmentNumber: generateAppointmentNumber(),
      clientId: member0.id,
      clientName: member0.fullName,
      staffId: "1",
      staffName: "John Smith",
      date: setHours(setMinutes(yesterday, 0), 10),
      time: "10:00",
      duration: 60,
      type: "PT Session",
      status: "COMPLETED",
      notes: "Completed successfully",
      ptPackageRecordId: "1",
    }
  );

  // Today's appointments
  appointments.push(
    {
      _id: "apt-1",
      appointmentNumber: generateAppointmentNumber(),
      clientId: member1.id,
      clientName: member1.fullName,
      staffId: "1",
      staffName: "John Smith",
      date: setHours(setMinutes(today, 0), 9),
      time: "09:00",
      duration: 60,
      type: "PT Session",
      status: "CONFIRMED",
      notes: "Focus on strength training",
    },
    {
      _id: "apt-2",
      appointmentNumber: generateAppointmentNumber(),
      clientId: member2.id,
      clientName: member2.fullName,
      staffId: "2",
      staffName: "Sarah Johnson",
      date: setHours(setMinutes(today, 30), 14),
      time: "14:30",
      duration: 60,
      type: "PT Session",
      status: "CONFIRMED",
      notes: "Cardio and flexibility",
    },
    {
      _id: "apt-3",
      appointmentNumber: generateAppointmentNumber(),
      clientId: member1.id,
      clientName: member1.fullName,
      staffId: "1",
      staffName: "John Smith",
      date: setHours(setMinutes(today, 0), 16),
      time: "16:00",
      duration: 45,
      type: "Follow-up",
      status: "SCHEDULED",
    }
  );

  // Tomorrow's appointments
  const tomorrow = addDays(today, 1);
  appointments.push(
    {
      _id: "apt-4",
      appointmentNumber: generateAppointmentNumber(),
      clientId: member2.id,
      clientName: member2.fullName,
      staffId: "2",
      staffName: "Sarah Johnson",
      date: setHours(setMinutes(tomorrow, 0), 10),
      time: "10:00",
      duration: 60,
      type: "PT Session",
      status: "SCHEDULED",
    },
    {
      _id: "apt-5",
      appointmentNumber: generateAppointmentNumber(),
      clientId: member3.id,
      clientName: member3.fullName,
      staffId: "1",
      staffName: "John Smith",
      date: setHours(setMinutes(tomorrow, 0), 11),
      time: "11:00",
      duration: 30,
      type: "Consultation",
      status: "SCHEDULED",
      notes: "New client consultation",
    },
    {
      _id: "apt-6",
      appointmentNumber: generateAppointmentNumber(),
      clientId: member1.id,
      clientName: member1.fullName,
      staffId: "1",
      staffName: "John Smith",
      date: setHours(setMinutes(tomorrow, 0), 15),
      time: "15:00",
      duration: 60,
      type: "PT Session",
      status: "SCHEDULED",
    }
  );

  // Next 2-7 days appointments
  for (let i = 2; i <= 7; i++) {
    const date = addDays(today, i);
    const times = [
      { hour: 9, minute: 0 },
      { hour: 10, minute: 30 },
      { hour: 14, minute: 0 },
      { hour: 15, minute: 30 },
      { hour: 17, minute: 0 },
    ];
    
    times.forEach((timeSlot, index) => {
      const memberIndex = (i + index) % mockMembers.length;
      const member = mockMembers[memberIndex];
      // Assign to PT trainers (staff IDs 1-4)
      const staffIndex = ((memberIndex % 4) + 1).toString();
      const staff = mockStaff.find(s => s._id === staffIndex);
      
      if (member && staff && Math.random() > 0.3) {
        appointments.push({
          _id: `apt-${appointments.length + 1}`,
          appointmentNumber: generateAppointmentNumber(),
          clientId: member.id,
          clientName: member.fullName,
          staffId: staff._id || "",
          staffName: staff.name,
          date: setHours(setMinutes(date, timeSlot.minute), timeSlot.hour),
          time: `${timeSlot.hour.toString().padStart(2, "0")}:${timeSlot.minute.toString().padStart(2, "0")}`,
          duration: index % 2 === 0 ? 60 : 45,
          type: index === 0 ? "Consultation" : "PT Session",
          status: "SCHEDULED",
        });
      }
    });
  }

  return appointments.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    if (dateA.getTime() === dateB.getTime()) {
      return a.time.localeCompare(b.time);
    }
    return dateA.getTime() - dateB.getTime();
  });
})();

