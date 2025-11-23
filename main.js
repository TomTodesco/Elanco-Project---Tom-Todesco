
const supabaseUrl = 'https://nnibzcljelrjdvreieai.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaWJ6Y2xqZWxyamR2cmVpZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDk3MDcsImV4cCI6MjA3OTI4NTcwN30.8ZcRRwlMZvDheNKwDrKQxLzMs37-DNLzMm_ngv4Oheg'
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey)

const markers = new Map();
let map  // needs to be global to be accessed in multiple functions


const layermarkers = {
    low: L.layerGroup(),
    medium: L.layerGroup(),
    high: L.layerGroup()    

}


function initializeMap() {
map = L.map('map').setView([51.505, -0.09], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

layermarkers.low.addTo(map);
layermarkers.medium.addTo(map);
layermarkers.high.addTo(map);

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
                lan: parseFloat(data[0].lon) 
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
    let common = null;
    let maxcount = 0;

    for(let i = 0;i < list.length;i++){
        let item = list[i];  // this grabs the name in the list

        if(list[item] > maxcount){
            maxcount = list[item];
            common = item;
        }
    }
    return common;



}


function displaymarkerinfo(marker){
    document.getElementById("local").textContent = marker.customid;
    document.getElementById("common-species").textContent = mostcommon(marker.data.species);
    document.getElementById("highest-severity").textContent = marker.data.level;
    document.getElementById("reported-date").textContent = marker.data.dates;
    document.getElementById("reportcount").textContent = marker.data.count;

}

async function createmarkers(location,date, species){
    if(markers.has(location)){
        const marker = markers.get(location);
        let oldlevel = marker.data.level;
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

        if(oldlevel !== marker.data.level){
            layermarkers[oldlevel.toLowerCase()].removeLayer(marker);
            layermarkers[marker.data.level.toLowerCase()].addLayer(marker);
        }

        //alert("marker species: "+ species + "count: " + marker.data.species[species]);

        

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

       const marker = L.marker([lat, lan]);
        marker.customid = location;
        marker.data = {
            count: 1,
            level: "Low",
            dates: date,
            species: [species]
            
        } 
        marker.data.species[species] = 1;
        marker.bindPopup(location + "<br>" + "Risk level:" + marker.data.level + "<br>" + "Number of reports: " + marker.data.count );
        marker.on('click', function(){
            displaymarkerinfo(marker);
        });

        marker.addTo(layermarkers.low);

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
    
    
    
    if (allData.length === 0) {
        alert("No data found!");
        return;
    }

        //const testData = data.slice(0, 10);  //  limit for testing purposes

        
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

function filterlevel(){
    const level = document.getElementById("severity").value;

    if(level === "all"){
        layermarkers.low.addTo(map);
        layermarkers.medium.addTo(map);
        layermarkers.high.addTo(map);
    }
    else if(level === "low"){
        layermarkers.low.addTo(map);
        map.removeLayer(layermarkers.medium);
        map.removeLayer(layermarkers.high);
    }
    else if(level === "medium"){
        layermarkers.medium.addTo(map);
        map.removeLayer(layermarkers.low);
        map.removeLayer(layermarkers.high);
    }
    else if(level === "high"){
        layermarkers.high.addTo(map);
        map.removeLayer(layermarkers.low);
        map.removeLayer(layermarkers.medium);
    }

}

function filterlocation(){

    const selectedlocation = document.getElementById("location").value;
    markers.forEach((marker) => {
        marker.remove();
    });

    if(selectedlocation === "all"){
        markers.forEach((marker) => {
            marker.addTo(layermarkers[marker.data.level.toLowerCase()]);   
        });
    }
    else{
        

        marker = markers.get(selectedlocation);
        if(marker){
            marker.addTo(layermarkers[marker.data.level.toLowerCase()]);
        }
        


       /* markers.forEach((marker,loc) => {
            if(selectedlocation === loc){
                alert("id matched" + loc);
                marker.addTo(layermarkers[marker.data.level.toLowerCase()]);
            }
        });*/
    }

}

function filterspecies(){

    const selectedspecies = document.getElementById("species").value;
    markers.forEach((marker) => {
        marker.remove();
    });

    if(selectedspecies === "all"){
        markers.forEach((marker) => {
            marker.addTo(layermarkers[marker.data.level.toLowerCase()]);   
        });
    }
    else{
        markers.forEach((marker, loc) => {
            let common = mostcommon(marker.data.species);
            if(selectedspecies === common){
                marker.addTo(layermarkers[marker.data.level.toLowerCase()]);
            }
        });
    }


}


function filterdate(){
    alert("date filter");
    const selecteddate = document.getElementById("date").value;

    const now = new Date();
    let cutoffdate;
    alert("starting converting");
    if(selecteddate === "alltime"){
        cutoffdate = null;
    }
    else if(selecteddate === "pastweek"){
        cutoffdate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    }
    else if(selecteddate === "pastmonth"){
        cutoffdate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    }
    else if(selecteddate === "pastyear"){
        cutoffdate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
    }
    else if(selecteddate === "past5years"){
        cutoffdate = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000); // 5 years ago
    }
    alert("converting done");

    markers.forEach((marker) => {
        marker.remove();
    });
        alert("markers removed");
    if(cutoffdate === null){
        alert("cutoff date is null");
        markers.forEach((marker) => {
            marker.addTo(layermarkers[marker.data.level.toLowerCase()]);   
        });
    }
    else{
        alert("other condition");
        markers.forEach((marker, loc) => {
            const markerdate = new Date(marker.data.dates);
            
            if(markerdate >= cutoffdate){
                marker.addTo(layermarkers[marker.data.level.toLowerCase()]);
            }
        });
    }


}





async function submitform(){
    let location = document.getElementById("location-input").value;
    location = location.charAt(0).toUpperCase() + location.slice(1);  //makes the location have a capital letter
    const dateinput = document.getElementById("date-input").value;
    const species = document.getElementById("species-input").value;

    const date = new Date(dateinput).toISOString();  // converts the date to ISO format for the database
    const genid = Math.random().toString(36).substring(2,15) + Math.random().toString(36).substring(2,15); // this creates a 2 random ids of lengths between10 and 13 and adds them together to gets a long enough id
    Event.preventDefault();
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