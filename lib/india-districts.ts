// Districts of Indian states, keyed by the state names used in INDIAN_STATES.
// Lists aim to be complete for each state. District boundaries occasionally
// change as states create new districts, so update here when needed.

// States covered by this dataset (also drives the market-page state selector).
export const STATES = [
  "Andhra Pradesh","Assam","Bihar","Chhattisgarh","Gujarat","Haryana",
  "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Odisha","Punjab","Rajasthan","Tamil Nadu","Telangana",
  "Uttar Pradesh","Uttarakhand","West Bengal",
] as const;

export const DISTRICTS_BY_STATE: Record<string, string[]> = {
  "Andhra Pradesh": [
    "Alluri Sitharama Raju","Anakapalli","Ananthapuramu","Annamayya","Bapatla",
    "Chittoor","Dr. B.R. Ambedkar Konaseema","East Godavari","Eluru","Guntur",
    "Kakinada","Krishna","Kurnool","Nandyal","NTR","Palnadu",
    "Parvathipuram Manyam","Prakasam","Sri Potti Sriramulu Nellore","Sri Sathya Sai",
    "Srikakulam","Tirupati","Visakhapatnam","Vizianagaram","West Godavari","YSR Kadapa",
  ],
  "Assam": [
    "Bajali","Baksa","Barpeta","Biswanath","Bongaigaon","Cachar","Charaideo",
    "Chirang","Darrang","Dhemaji","Dhubri","Dibrugarh","Dima Hasao","Goalpara",
    "Golaghat","Hailakandi","Hojai","Jorhat","Kamrup","Kamrup Metropolitan",
    "Karbi Anglong","Karimganj","Kokrajhar","Lakhimpur","Majuli","Morigaon",
    "Nagaon","Nalbari","Sivasagar","Sonitpur","South Salmara-Mankachar","Tamulpur",
    "Tinsukia","Udalguri","West Karbi Anglong",
  ],
  "Bihar": [
    "Araria","Arwal","Aurangabad","Banka","Begusarai","Bhagalpur","Bhojpur",
    "Buxar","Darbhanga","East Champaran (Motihari)","Gaya","Gopalganj","Jamui",
    "Jehanabad","Kaimur (Bhabua)","Katihar","Khagaria","Kishanganj","Lakhisarai",
    "Madhepura","Madhubani","Munger","Muzaffarpur","Nalanda","Nawada","Patna",
    "Purnia","Rohtas","Saharsa","Samastipur","Saran","Sheikhpura","Sheohar",
    "Sitamarhi","Siwan","Supaul","Vaishali","West Champaran (Bettiah)",
  ],
  "Chhattisgarh": [
    "Balod","Baloda Bazar","Balrampur","Bastar","Bemetara","Bijapur","Bilaspur",
    "Dantewada","Dhamtari","Durg","Gariaband","Gaurela-Pendra-Marwahi","Janjgir-Champa",
    "Jashpur","Kabirdham (Kawardha)","Kanker","Khairagarh-Chhuikhadan-Gandai","Kondagaon",
    "Korba","Koriya","Mahasamund","Manendragarh-Chirmiri-Bharatpur","Mohla-Manpur-Chowki",
    "Mungeli","Narayanpur","Raigarh","Raipur","Rajnandgaon","Sakti","Sarangarh-Bilaigarh",
    "Sukma","Surajpur","Surguja",
  ],
  "Gujarat": [
    "Ahmedabad","Amreli","Anand","Aravalli","Banaskantha (Palanpur)","Bharuch",
    "Bhavnagar","Botad","Chhota Udaipur","Dahod","Dang (Ahwa)","Devbhoomi Dwarka",
    "Gandhinagar","Gir Somnath","Jamnagar","Junagadh","Kheda (Nadiad)","Kutch","Mahisagar",
    "Mehsana","Morbi","Narmada (Rajpipla)","Navsari","Panchmahal (Godhra)","Patan",
    "Porbandar","Rajkot","Sabarkantha (Himmatnagar)","Surat","Surendranagar","Tapi (Vyara)",
    "Vadodara","Valsad",
  ],
  "Haryana": [
    "Ambala","Bhiwani","Charkhi Dadri","Faridabad","Fatehabad","Gurugram","Hisar",
    "Jhajjar","Jind","Kaithal","Karnal","Kurukshetra","Mahendragarh","Nuh","Palwal",
    "Panchkula","Panipat","Rewari","Rohtak","Sirsa","Sonipat","Yamunanagar",
  ],
  "Himachal Pradesh": [
    "Bilaspur","Chamba","Hamirpur","Kangra","Kinnaur","Kullu","Lahaul and Spiti",
    "Mandi","Shimla","Sirmaur","Solan","Una",
  ],
  "Jharkhand": [
    "Bokaro","Chatra","Deoghar","Dhanbad","Dumka","East Singhbhum","Garhwa","Giridih",
    "Godda","Gumla","Hazaribagh","Jamtara","Khunti","Koderma","Latehar","Lohardaga",
    "Pakur","Palamu","Ramgarh","Ranchi","Sahebganj","Seraikela-Kharsawan","Simdega",
    "West Singhbhum",
  ],
  "Karnataka": [
    "Bagalkot","Ballari","Belagavi","Bengaluru Rural","Bengaluru Urban","Bidar",
    "Chamarajanagar","Chikkaballapur","Chikkamagaluru","Chitradurga","Dakshina Kannada",
    "Davanagere","Dharwad","Gadag","Hassan","Haveri","Kalaburagi","Kodagu","Kolar",
    "Koppal","Mandya","Mysuru","Raichur","Ramanagara","Shivamogga","Tumakuru","Udupi",
    "Uttara Kannada","Vijayanagara","Vijayapura","Yadgir",
  ],
  "Kerala": [
    "Alappuzha","Ernakulam","Idukki","Kannur","Kasaragod","Kollam","Kottayam",
    "Kozhikode","Malappuram","Palakkad","Pathanamthitta","Thiruvananthapuram",
    "Thrissur","Wayanad",
  ],
  "Madhya Pradesh": [
    "Agar Malwa","Alirajpur","Anuppur","Ashoknagar","Balaghat","Barwani","Betul",
    "Bhind","Bhopal","Burhanpur","Chhatarpur","Chhindwara","Damoh","Datia","Dewas",
    "Dhar","Dindori","Guna","Gwalior","Harda","Indore","Jabalpur","Jhabua","Katni",
    "Khandwa","Khargone","Mandla","Mandsaur","Morena","Narmadapuram (Hoshangabad)",
    "Narsinghpur","Neemuch","Niwari","Panna","Raisen","Rajgarh","Ratlam","Rewa","Sagar",
    "Satna","Sehore","Seoni","Shahdol","Shajapur","Sheopur","Shivpuri","Sidhi","Singrauli",
    "Tikamgarh","Ujjain","Umaria","Vidisha",
  ],
  "Maharashtra": [
    "Ahmednagar","Akola","Amravati","Beed","Bhandara","Buldhana","Chandrapur",
    "Chhatrapati Sambhajinagar (Aurangabad)","Dharashiv (Osmanabad)","Dhule","Gadchiroli",
    "Gondia","Hingoli","Jalgaon","Jalna","Kolhapur","Latur","Mumbai City","Mumbai Suburban",
    "Nagpur","Nanded","Nandurbar","Nashik","Palghar","Parbhani","Pune","Raigad","Ratnagiri",
    "Sangli","Satara","Sindhudurg","Solapur","Thane","Wardha","Washim","Yavatmal",
  ],
  "Odisha": [
    "Angul","Balangir","Balasore","Bargarh","Bhadrak","Boudh","Cuttack","Deogarh",
    "Dhenkanal","Gajapati","Ganjam","Jagatsinghpur","Jajpur","Jharsuguda","Kalahandi",
    "Kandhamal","Kendrapara","Kendujhar (Keonjhar)","Khordha","Koraput","Malkangiri",
    "Mayurbhanj","Nabarangpur","Nayagarh","Nuapada","Puri","Rayagada","Sambalpur",
    "Subarnapur (Sonepur)","Sundargarh",
  ],
  "Punjab": [
    "Amritsar","Barnala","Bathinda","Faridkot","Fatehgarh Sahib","Fazilka","Ferozepur",
    "Gurdaspur","Hoshiarpur","Jalandhar","Kapurthala","Ludhiana","Malerkotla","Mansa",
    "Moga","Pathankot","Patiala","Rupnagar (Ropar)","Sangrur","SAS Nagar (Mohali)",
    "SBS Nagar (Nawanshahr)","Sri Muktsar Sahib","Tarn Taran",
  ],
  "Rajasthan": [
    "Ajmer","Alwar","Banswara","Baran","Barmer","Bharatpur","Bhilwara","Bikaner","Bundi",
    "Chittorgarh","Churu","Dausa","Dholpur","Dungarpur","Hanumangarh","Jaipur","Jaisalmer",
    "Jalore","Jhalawar","Jhunjhunu","Jodhpur","Karauli","Kota","Nagaur","Pali","Pratapgarh",
    "Rajsamand","Sawai Madhopur","Sikar","Sirohi","Sri Ganganagar","Tonk","Udaipur",
  ],
  "Tamil Nadu": [
    "Ariyalur","Chengalpattu","Chennai","Coimbatore","Cuddalore","Dharmapuri","Dindigul",
    "Erode","Kallakurichi","Kanchipuram","Kanyakumari","Karur","Krishnagiri","Madurai",
    "Mayiladuthurai","Nagapattinam","Namakkal","Nilgiris","Perambalur","Pudukkottai",
    "Ramanathapuram","Ranipet","Salem","Sivaganga","Tenkasi","Thanjavur","Theni",
    "Thoothukudi (Tuticorin)","Tiruchirappalli","Tirunelveli","Tirupathur","Tiruppur",
    "Tiruvallur","Tiruvannamalai","Tiruvarur","Vellore","Viluppuram","Virudhunagar",
  ],
  "Telangana": [
    "Adilabad","Bhadradri Kothagudem","Hanumakonda","Hyderabad","Jagtial","Jangaon",
    "Jayashankar Bhupalpally","Jogulamba Gadwal","Kamareddy","Karimnagar","Khammam",
    "Kumuram Bheem Asifabad","Mahabubabad","Mahabubnagar","Mancherial","Medak",
    "Medchal-Malkajgiri","Mulugu","Nagarkurnool","Nalgonda","Narayanpet","Nirmal",
    "Nizamabad","Peddapalli","Rajanna Sircilla","Rangareddy","Sangareddy","Siddipet",
    "Suryapet","Vikarabad","Wanaparthy","Warangal","Yadadri Bhuvanagiri",
  ],
  "Uttar Pradesh": [
    "Agra","Aligarh","Ambedkar Nagar","Amethi","Amroha","Auraiya","Ayodhya","Azamgarh",
    "Baghpat","Bahraich","Ballia","Balrampur","Banda","Barabanki","Bareilly","Basti",
    "Bhadohi","Bijnor","Budaun","Bulandshahr","Chandauli","Chitrakoot","Deoria","Etah",
    "Etawah","Farrukhabad","Fatehpur","Firozabad","Gautam Buddha Nagar","Ghaziabad",
    "Ghazipur","Gonda","Gorakhpur","Hamirpur","Hapur","Hardoi","Hathras","Jalaun","Jaunpur",
    "Jhansi","Kannauj","Kanpur Dehat","Kanpur Nagar","Kasganj","Kaushambi","Kheri","Kushinagar",
    "Lalitpur","Lucknow","Maharajganj","Mahoba","Mainpuri","Mathura","Mau","Meerut","Mirzapur",
    "Moradabad","Muzaffarnagar","Pilibhit","Pratapgarh","Prayagraj","Raebareli","Rampur",
    "Saharanpur","Sambhal","Sant Kabir Nagar","Shahjahanpur","Shamli","Shravasti","Siddharthnagar",
    "Sitapur","Sonbhadra","Sultanpur","Unnao","Varanasi",
  ],
  "Uttarakhand": [
    "Almora","Bageshwar","Chamoli","Champawat","Dehradun","Haridwar","Nainital",
    "Pauri Garhwal","Pithoragarh","Rudraprayag","Tehri Garhwal","Udham Singh Nagar","Uttarkashi",
  ],
  "West Bengal": [
    "Alipurduar","Bankura","Birbhum","Cooch Behar","Dakshin Dinajpur","Darjeeling","Hooghly",
    "Howrah","Jalpaiguri","Jhargram","Kalimpong","Kolkata","Malda","Murshidabad","Nadia",
    "North 24 Parganas","Paschim Bardhaman","Paschim Medinipur","Purba Bardhaman","Purba Medinipur",
    "Purulia","South 24 Parganas","Uttar Dinajpur",
  ],
};
