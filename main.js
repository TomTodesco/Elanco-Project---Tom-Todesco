
const supabaseUrl = 'https://nnibzcljelrjdvreieai.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaWJ6Y2xqZWxyamR2cmVpZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDk3MDcsImV4cCI6MjA3OTI4NTcwN30.8ZcRRwlMZvDheNKwDrKQxLzMs37-DNLzMm_ngv4Oheg'
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey)

const markers = new Map();
let map  // needs to be global to be accessed in multiple functions

function initializeMap() {
map = L.map('map').setView([51.505, -0.09], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);


return map;
}


async function geocodecity(location) {
    try {
        // Using Nominatim (OpenStreetMap) geocoding - free, no API key needed
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`
        );
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lan: parseFloat(data[0].lon) // Note: Nominatim uses "lon" not "lan"
            };
        } else {
            return null;
        }
    } catch (error) {
        console.error("Geocoding error:", error);
        return null;
    }
}

function mostcommon(list){  //  this checks the most common element in a list
    alert("running mostcommon");
    let count = {};
    let check = {};

    for(let i = 0; i< list.length;i++){
        if(list[i] in check){
            alert("found in check:"+list[i]);
            let index = check.indexof(list[i]);
            alert("index is:"+ index);
            alert("current count is:"+ count[index]);
            count[index] += 1;
            alert("new count is:"+ count[index]);
        }
        else{
            count[i] = 1;
            check[i] = list[i];
            alert("added to check:"+list[i]);
        }
        


    }

    let maxcount = 0;
    let common = null;
    let maxindex = 0;

    for(let item = 0; item<count.length;item++){      // loops through count and checks which one is the highest value
        if(count[item] > maxcount){
            alert("new max found:"+ count[item]);
            maxcount = count[item];
            maxindex = count.indexof(maxcount);
            alert("max index is:"+ maxindex);

            common = check[maxindex];
            alert("most common is:"+ common);

        }
    }

    return common;



}


function displaymarkerinfo(marker){
    document.getElementById("local").textContent = marker.customid;
    document.getElementById("common-species").textContent = marker.data.species;
    document.getElementById("highest-severity").textContent = marker.data.level;
    document.getElementById("reported-date").textContent = marker.data.dates;
    document.getElementById("reportcount").textContent = marker.data.count;


}

async function createmarkers(location,date, species){
    if(markers.has(location)){
        const marker = markers.get(location);
        marker.data.count += 1;
        if(marker.data.count > 50 && marker.data.count <=70){
            marker.data.level = "Medium";
        }
        else if(marker.data.count > 70){
            marker.data.level = "High";
        }
        if(marker.data.dates < date){
            marker.data.dates = date;
        }
        if(!marker.data.species.includes(species)){
            marker.data.species.push(species);
            marker.data.species[species] = 1;
        }
        else{
            marker.data.species[species] += 1;
        }

        alert("marker species: "+ species + "count: " + marker.data.species[species]);

        //marker.data.mostcommon = mostcommon(marker.data.species);

        marker.bindPopup(location + "<br>" + "Risk level:" + marker.data.level + "<br>" + "Number of reports: " + marker.data.count );
        return marker;
    }
    else{
        try{

        const coords = await geocodecity(location);

        if (!coords) {
            alert("Failed to geocode: " + location); // to see if there's an error
            return;
        }

        const {lat,lan} = coords;

       const marker = L.marker([lat, lan]).addTo(map);
        marker.customid = location;
        marker.data = {
            count: 1,
            level: "Low",
            dates: date,
            species: [species]
            //mostcommon: species
        } 
        marker.data.species[species] = 1;
        marker.bindPopup(location + "<br>" + "Risk level:" + marker.data.level + "<br>" + "Number of reports: " + marker.data.count );
        marker.on('click', function(){
            displaymarkerinfo(marker);
        });

        markers.set(location, marker);
        return marker;
    }catch (err) {
            alert("Error creating marker for " + location + ": " + err.message);  //  error pop up if the marker doesn't load
            return null;
        }
    }




}

async function grabdata(){
    
     let allData = [];
    let start = 0;
    const batchSize = 1000;
    let hasmore = true;
    
    //used to get around the limit on the amount of rows able to be fetched
    while(hasmore){
        const { data, error: error1 } = await supabase
            .from('tick_data')
            .select('*')
            .range(start, start + batchSize - 1);
    
        if(error1){
            alert("Error fetching batch: " + error1.message);
            return;
        }

        if(data && data.length > 0){
            allData = allData.concat(data);   // adds the new data to allData
            start += batchSize;
        }
        else{
            hasmore = false;
        }

        if(data.length < batchSize){  //if the rows retrieved are less than the batch size, then there is no more data to fetch
            hasmore = false;
        }

    }
    
    alert("Total fetched: " + allData.length + " rows");
    
    if (allData.length === 0) {
        alert("No data found!");
        return;
    }

        //const testData = data.slice(0, 10);  //  limit for testing purposes

        alert(allData.length + " records found.");
       for (let i = 0; i < allData.length; i++) {
    
    try {

        let row = allData[i];
        
        const location = row.location;
        const date = row.date;
        const species = row.species;
        
        await createmarkers(location, date, species);
        
        
    } catch (err) {
        alert("ERROR in loop: " + err.message);
    }
}

alert("loop complete!");
   

}


async function submitform(){
    let location = document.getElementById("location-input").value;
    location = location.charAt(0).toUpperCase() + location.slice(1);  //makes the location have a capital letter
    const dateinput = document.getElementById("date-input").value;
    const species = document.getElementById("species-input").value;

    const date = new Date(dateinput).toISOString();  // converts the date to ISO format for the database
    const genid = Math.random().toString(36).substring(2,15) + Math.random().toString(36).substring(2,15); // this creates a 2 random ids of lengths between10 and 13 and adds them together to gets a long enough id
    alert(location + date+ species +genid );
 
    if(location === "" || date === "" || species === "")
    {
        alert("Please can you fill in all the boxes")
    }
    else{
        const {data, error} = await supabase
        .from("tick_data")
        .insert([{
            id: genid,
            date: date,
            location: location,
            species: species
        }]);


        if(error){
            alert("Error" + err.message);
        }
        else{
            alert("Thank You, Your Report has been submiited");
        }

    }

}


// these are all button switching functions
function switchtoinfo(){
    document.getElementById("information").classList.remove("hidden");
    document.getElementById("prevention").classList.add("hidden");
    document.getElementById("form").classList.add("hidden");
}

function switchtoprevention(){
    document.getElementById("prevention").classList.remove("hidden");
    document.getElementById("information").classList.add("hidden");
    document.getElementById("form").classList.add("hidden");
}

function switchtoform(){
    document.getElementById("form").classList.remove("hidden")
    document.getElementById("information").classList.add("hidden");
    document.getElementById("prevention").classList.add("hidden");


}

function switchtofoxbadger(){

    document.getElementById("foxbadger").classList.remove("hidden");
    document.getElementById("marsh").classList.add("hidden");
    document.getElementById("passerine").classList.add("hidden");
    document.getElementById("southern rodent").classList.add("hidden");
    document.getElementById("tree-hole").classList.add("hidden");

}

function switchtomarsh(){
    document.getElementById("marsh").classList.remove("hidden");
    document.getElementById("foxbadger").classList.add("hidden");
    document.getElementById("passerine").classList.add("hidden");
    document.getElementById("southern rodent").classList.add("hidden");
    document.getElementById("tree-hole").classList.add("hidden");
}

function switchtopasserine(){
    document.getElementById("passerine").classList.remove("hidden");
    document.getElementById("foxbadger").classList.add("hidden");
    document.getElementById("marsh").classList.add("hidden");
    document.getElementById("southern rodent").classList.add("hidden");
    document.getElementById("tree-hole").classList.add("hidden");
}

function switchtosouthern(){
    document.getElementById("southern rodent").classList.remove("hidden");
    document.getElementById("foxbadger").classList.add("hidden");
    document.getElementById("marsh").classList.add("hidden");
    document.getElementById("passerine").classList.add("hidden");
    document.getElementById("tree-hole").classList.add("hidden");
}

function switchtotreehole(){
    document.getElementById("tree-hole").classList.remove("hidden");
    document.getElementById("foxbadger").classList.add("hidden");
    document.getElementById("marsh").classList.add("hidden");
    document.getElementById("passerine").classList.add("hidden");
    document.getElementById("southern rodent").classList.add("hidden");
}






initializeMap();
grabdata();
