/**
 * Your Maps Your Way (YMYW), a generic land cover  classification. This script allows an interactive classification
 * of land cover. The user must first specify an area of interest (AOI) and then digitise training and validation
 * chips of different land cover classes. Once the training areas for the each land cover classes are digitised, the user
 * can perform the classification, training a Random Forest classifier. The result classification is drawn on the screen
 * within the AOI. To revise, refine, delete or add more training chips, then run the classification again.
 *
 * To define an AOI, use the Geometry Imports tool to create a geometry and name it 'aoi'. Use the drawing tools
 * to draw your AOI. Normally this will be a minimum bounding rectangle.
 *
 * To digitise training chips, use the Geometry Imports tool and create a feature. Set the name to the specific
 * land cover name and give the feature a property called"land_class" and assign it a unique integer identifier.
 * Then use the Draw a Rectangle drawing tool to draw features within the AOI. It is recommended to display the GEE
 * default satellite layer or one of the seasonal satellite layers (Show composites) to visually identify the land
 * cover types for digitising training chips.
 *
 * The smileRandomForest classifier is used for classification. To balance the classification, the same number of
 * training observations is provided for each land cover class, regardless of the number of training chips. 
 * This avoids bias and ensures that rarer classes are not underrepresented in the classification. Once the classification
 *  is complete, you can validate your classification (Validate classification). The validation uses a set of points drawn
 * from chips that were not used to train the classifier.
  * Recommend https://beautifier.io/ to tidy up code
 *           https://www.jslint.com/ for style compliance
 *
 * Authors: Dan Morton & Reto Schmucki
 * Version: 1.1.dev_branch_danm_250423
 * Date: 25/04/2023
 * Licence: MIT Licence, Copyright (c) 2023 UK Centre for Ecology & Hydrology
 */


/**
 * Change this to change the title
 * */
function getTitle() {
    return "UKCEH: Your Maps Your Way (YMYW)";
}

/**
 * To use another name for your land cover feature, change this.
 * */
function getLandClass() {
    return "land_class";
}


var bn = {
    b00: "",
    b01: "B1",
    b02: "B2",
    b03: "B3",
    b04: "B4",
    b05: "B5",
    b06: "B6",
    b07: "B7",
    b08: "B8",
    b09: "B9",
    b10: "B10",
    b11: "B11",
    b12: "B12"
};

var bands = {
    sentinel2: [bn.b02, bn.b03, bn.b04, bn.b05, bn.b06,
    bn.b07, bn.b08, bn.b11, bn.b12],
    landsat8: [bn.b02, bn.b03, bn.b04, bn.b05, bn.b06, bn.b07],
    l8display: [],
    s2display: [],
    planet: []
};

var colour =
{
    black: "#000000",
    blue: "#0000ff",
    border: "#0000ff",
    cyan: "#24C1E0",
    grey: "#F8F9FA",
    gray: "#F8F9FA",
    red: "#ff0000",
    title: "#F2F2F2",
    transparent: "#11ffee00"
};

/**
 * No yet implemented, but it will be useful to make more context layers available.  
 * */
var context =
{
    distRoad: 1,
    distRiver: 1,
    soilType: "etc",
    nLayers: 0,
    stack: null
};

var epsg = {
    britishNationalGrid: "epsg:27700",
    irishNationalGrid: "epsg:29900",
    wgs84: "epsg:4326"
};

var resolution =
{
    sentinel2: 10,
    landsat8: 30,
    planet: 3
};

var satelliteCollection = {
    L8SR: "LANDSAT/LC08/C01/T1_SR",
    L8TOA: "LANDSAT/LC08/C01/T1_TOA",
    S2SR: "COPERNICUS/S2_SR",
    S2TOA: "COPERNICUS/S2",
    PLANET: "PLANET"
};


var stat = {
    mean: "mean",
    median: "median"
};


var terrain = {
    height: function () { return srtm.select("elevation").toInt16() },
    slope: function () { return ee.Terrain.slope(terrain.height()).toInt16() },
    aspect: function () { return ee.Terrain.aspect(terrain.height()).toInt16() },
    stack: function () { return terrain.height().addBands(terrain.slope()).addBands(terrain.aspect()) },
    nLayers: 3
};

/**
 * Please use the setter associated with these global variables.  It is safer 
 * than "=" and will hopefully make the code less buggy. For example, 
 * instead of:
 * 
 * ymyw.cloud = 50; use
 * 
 * ymyw.setCloud(50);
 **/
var ymyw = {
    cloud: 30, // Cloud tolerance (%) per image
    setCloud: function (val) { ymyw.cloud = val; },

    nTrees: 100, // Number of trees in forest
    setNTrees: function (val) { ymyw.nTrees = val; return val },

    nTrainPoints: 1400, // Number of points to generate per training class
    setNTrainPoints: function (val) { ymyw.nTrainPoints = val; return val; },

    nValidPoints: 600, // Number of points to generate per training class
    setNValidPoints: function (val) { ymyw.nValidPoints = val; return val; },

    propVali: 30,// Percentage of training chips used for validation
    setPropVali: function (val) { ymyw.propVali = val; return val; },

    trainingSeed: 17, // Random number for training data selection
    setTrainingSeed: function (val) { ymyw.trainingSeed = val; return val; },

    valSeed: 13, // Random division of training, validation chips and validation
    setValSeed: function (val) { ymyw.valSeed = val; return val; },

    bandStat: stat.median,
    setBandStat: function (val) { ymyw.bandStat = val; return val; },

    collectionName: satelliteCollection.S2SR,
    setCollectionName: function (val) { ymyw.collectionName = val; return val; },

    intervals: "0,3:3,6:6,9:9,12",
    setIntervals: function (val) { ymyw.intervals = val; return val; },

    baseDate: ee.Date(Date.now()).advance(-1, "year").advance(-1, "day"),
    setBaseDate: function (val) { ymyw.baseDate = val; return val; },

    bands: null,
    setBands: function (val) { ymyw.bands = val; return val; },

    trainingPoints: null,
    setTrainingPoints: function (val) { ymyw.trainingPoints = val; return val; },

    randomPoints: null,
    setRandomPoints: function (val) { ymyw.randomPoints = val; return val; },

    trainingData: null,
    setTrainingData: function (val) { ymyw.trainingData = val; return val; },

    validationPoints: null,
    setValidationPoints: function (val) { ymyw.validationPoints = val; return val; },

    testAccuracy: null,
    setTestAccuracy: function (val) { ymyw.testAccuracy = val; return val; },

    randomForest: null,
    setRandomForest: function (val) { ymyw.randomForest = val; return val; },

    classifiedMap: null,
    setClassifiedMap: function (val) { ymyw.classifiedMap = val; return val; },

    classifiedPixels: null,
    setClassifiedPixels: function (val) { ymyw.classifiedPixels = val; return val; },

    probabilityPixels: null,
    setProbabilityPixels: function (val) { ymyw.probabilityPixels = val; return val; },

    aoiMap: null,
    setAoiMap: function (val) { ymyw.aoiMap = val; return val; },

    legend: null,
    setLegend: function (val) { ymyw.legend = val; return val; },

    resolution: null,
    setResolution: function (val) { ymyw.resolution = val; return val; },

    imageStack: null,
    setImageStack: function (val) { ymyw.imageStack = val; return val; },

    displayLayers: null,
    setDisplayLayers: function (val) { ymyw.displayLayers = val; return val; },

    heightLayer: null,
    setHeightLayer: function (val) { ymyw.heightLayer = val; return val; },

    aspectLayer: null,
    setAspectLayer: function (val) { ymyw.aspectLayer = val; return val; },

    slopeLayer: null,
    setSlopeLayer: function (val) { ymyw.slopeLayer = val; return val; },

    validationData: null,
    setValidationData: function (val) { ymyw.validationData = val; return val; },

    contextLayers: null,
    setContextLayers: function (val) { ymyw.contextLayers = val; return val; },

    borderColour: colour.blue,
    setBorderColour: function (val) { ymyw.borderColour = val; return val; },

    EPSG: epsg.wgs84,
    setEPSG: function (val) { ymyw.EPSG = val; return val; }
};

/**
 * Initialises the app, init!
 * */
function init() {
    var aoiArea = aoi.area({
        "maxError": 1
    });

    // Draw the AOI if it exists
    ymyw.aoiMap = drawAOI(ymyw.aoiMap, getAOI(Map.drawingTools().layers()),
        ymyw.borderColour);
    reCentre();

    // Print centroid and area of AOI in Km2 to the console.
    print("AOI centroid =", aoi.centroid({
        "maxError": 1
    }));

    print("AOI area Km2 =", aoiArea.divide(ee.Number(1000000)).round());

    //Initiate defaults
    setCollectionCallback(ymyw.collectionName);
}

init();

/**
 * Gets AOI
 * */
function getAOI(layers) {
    return layers.filter(function (l) {
        var str = l.get("name");
        if (str === "aoi") return l;
    })[0].getEeObject();
}

/**
 * Rock 'n roll!
 * */
function getBands(imageCollection) {
    //print("in bands");
    var b = null;
    switch (imageCollection) {
        case satelliteCollection.L8TOA:
        case satelliteCollection.L8SR: b = bands.landsat8;
            break;
        case satelliteCollection.S2SR:
        case satelliteCollection.S2TOA: b = bands.sentinel2;
            break;
        case satelliteCollection.PLANET: b = bands.planet;
            break;
    }
    //print("bands",b);
    return b;
}

/**
 * What it says on the tin
 * */
function getCalStartDate(collectionName) {
    switch (collectionName) {
        // Sentinel-2
        case satelliteCollection.S2SR:
        case satelliteCollection.S2TOA:
        case satelliteCollection.PLANET:
            return "2017-01-01";
        case satelliteCollection.L8SR:
        case satelliteCollection.L8TOA:
            return "2014-01-01";
    }
}


/**
 * Parse interval string return an array of date filters.
 * */
function getDateFilters(intervalString) {
    var splTxt = intervalString.split(":");
    var outArray = new Array(splTxt.length);
    for (var ii = 0; ii < splTxt.length; ++ii) {
        var sp = splTxt[ii].split(",");
        var start = parseInt(sp[0], 10);
        var end = parseInt(sp[1], 10);
        outArray[ii] = ee.Filter.date(ymyw.baseDate.advance(start, "month"), ymyw.baseDate
            .advance(end, "month"));
        //print(outArray[ii]);
    }
    return outArray;
}

/**
 * Get cloud parameters
 * */
function getImageCreationParams(imageCollection) {

    var f =
    {
        cloudParam: null,
        maskFunction: null,
        multiplier: null
    };

    switch (imageCollection) {
        case satelliteCollection.S2SR:
        case satelliteCollection.S2TOA:
            f.cloudParam = "CLOUDY_PIXEL_PERCENTAGE";
            f.maskFunction = maskS2clouds;
            f.multiplier = 1000.0;
            break;
        case satelliteCollection.L8SR:
            f.cloudParam = "CLOUD_COVER";
            f.maskFunction = maskL8SRclouds;
            f.multiplier = 1.0;
            break;
        case satelliteCollection.L8TOA:
            f.cloudParam = "CLOUD_COVER";
            f.maskFunction = maskL8TOAclouds;
            f.multiplier = 1.0;
            break;
    }

    return f;
}

/**
 * Get labelled pixels with type property from the imageStack
 * */
function getLabeledPixels(imageStack, trainingPoints, property) {
    var training = null;
    try {
        training = imageStack.sampleRegions(
            {
                collection: trainingPoints,
                properties: [property],
                scale: 1
            });
    }
    catch (error) {
        throw ("Error: Choose an image collection and set the start date");
    }
    return training;
}

/**
 * 
 * */
function getNumberOfContextLayers() {
    // We don't do this, yet.
    return context.nLayers;
}

/**
 * Get the number of temporal intervals
 * */
function getNumberOfIntervals() {
    return getDateFilters(textBoxSetIntervals.getValue()).length;
}

/**
 * Get the number of terrain layers
 * */
function getNumberOfTerrainLayers() {
    return terrain.nLayers;
}

/**
 * Gets the palette colours according to drawn layers.
 * */
function getPaletteColours(layers, property) {
    var palette = [colour.black];
    for (var ii = 1; ii < layers.length() - 1; ++ii) {
        palette.push(colour.black);
    }
    var f_map = function (f) {
        var name = f.get("name");
        if (name === "aoi") return null;
        var colour = f.get("color");
        var value = f.getEeObject().get(property);
        if (!value) return null;
        palette[value.getInfo() - 1] = colour;
        return null;
    };
    layers.map(f_map);
    return palette;
}

/**
 * Gets the palette names.
 * */
function getPaletteNames(layers, property) {
    var names = new Array(layers.length);
    var fMap = function (f) {
        var name = f.get("name");
        if (name === "aoi") return null;
        var o = f.getEeObject();
        var value = o.get(property);
        if (!value) return null;
        names[value.getInfo() - 1] = name;
        return null;
    };
    layers.map(fMap);
    return names;
}

/**
 * Every new year
 * */
function getResolution(imageCollection) {

    var res = 0;
    switch (imageCollection) {
        case satelliteCollection.L8TOA:
        case satelliteCollection.L8SR: res = resolution.landsat8;
            break;
        case satelliteCollection.S2SR:
        case satelliteCollection.S2TOA: res = resolution.sentinel2;
            break;
        case satelliteCollection.PLANET: res = resolution.planet;
            break;
    }

    return res;
}

/**
 * Get season
 * */
function getSeason(imageCollection, cloudCover, bands, season, bandStat) {

    var imgParams = getImageCreationParams(imageCollection);
    var cParam = imgParams.cloudParam;
    var cFunction = imgParams.maskFunction;
    var multiplier = imgParams.multiplier;

    var img = ee.ImageCollection(imageCollection).filter(season).filter(ee
        .Filter.lt(cParam, cloudCover)).map(cFunction).select(bands);

    print("All metadata:", img.filterBounds(aoi.centroid(
        {
            "maxError": 1
        })));

    //getCollection(imageCollection, cloudCover, bands, season, cld.cloudParam, cld.maskFunction);
    switch (bandStat) {
        case stat.median:
            img = img.median();
            break;
        case stat.mean:
            img = img.mean();
            break;
    }

    if (img === null) return null;

    return img.unmask().multiply(multiplier).toInt16();

}

/**
 * Gets the satellite image stack and appends the context layers
 * */
function getStack(imageCollection) {
    var theComposite = null;
    var s = getDateFilters(textBoxSetIntervals.getValue());

    if (imageCollection === null) {
        return null;
    }

    for (var ii = 0; ii < s.length; ++ii) {
        //print("s[", ii, "], imageCollection, cloud, bands, stat", s[ii], imageCollection, ymyw.cloud, ymyw.bands, ymyw.bandStat);
        var c = getSeason(imageCollection, ymyw.cloud, ymyw.bands, s[ii], ymyw.bandStat);
        theComposite = (ii === 0) ? c : theComposite.addBands(c);
    }

    if (context.stack !== null)
        theComposite.addBands(context.stack());

    if (terrain.stack() !== null)
        theComposite.addBands(terrain.stack());

    return theComposite;
}

/**
 * Get the vizualisation parameters for specific seasonal composites.
 * */
function getVizParams(imageCollection, season, r, g, b) {
    if (season > 0) {
        r += "_" + season;
        g += "_" + season;
        b += "_" + season;
    }
    //specific dispaly/vizualisation parameters
    switch (imageCollection) {
        case satelliteCollection.S2TOA:
            return {
                bands: [r, g, b],
                min: 0,
                max: 500,
                gamma: [0.95, 1.1, 1]
            };
        case satelliteCollection.S2SR:
            return {
                bands: [r, g, b],
                min: 0,
                max: 500,
                gamma: [0.95, 1.1, 1]
            };
        case satelliteCollection.L8TOA:
            return {
                bands: [r, g, b],
                min: 0,
                max: 400,
                gamma: [0.95, 1.1, 1]
            };
        case satelliteCollection.L8SR:
            return {
                bands: [r, g, b],
                min: 0,
                max: 4000,
                gamma: [0.95, 1.1, 1]
            };
    }

    return null;
}

/*
 * Wrapper function for classifier training.
 */
function buildRandomForest(training, nT, property, bandOrder) {
    return ee.Classifier.smileRandomForest(nT).train(
        {
            features: training,
            classProperty: property,
            inputProperties: bandOrder
        });
}

/*
 * Wrapper. Classify land cover within the AOI
 */
function classifyAOI(theComposite, theTrained, theAoi) {
    return theComposite.clip(theAoi).classify(theTrained);
}

/**
 * Create points from classification chips draw
 * */
function createDataPoints(layers, nP, seed, property, propSub, valSeed) {
    propSub = ee.String("random ").cat(propSub);

    var multipoly2poly = function (feature) {
        var multipoly = feature.geometry();
        var size = multipoly.coordinates().size();
        var polylist = ee.List.sequence(0, size.add(-1), 1)
            .map(function (listelem) {
                return ee.Feature(feature).setGeometry(ee.Geometry
                    .Polygon(multipoly.coordinates().get(listelem)));
            });
        return ee.FeatureCollection(polylist).randomColumn("random",
            valSeed, "uniform");
    };

    //Features used for labels
    var trainingObjects = layers.filter(
        function (l) {
            if (l.getEeObject().name() === "Feature") return l;
        });

    var land_features = ee.FeatureCollection(trainingObjects.map(
        function (f) {
            var poly = f.getEeObject();
            poly = multipoly2poly(poly);
            var randomSample70 = poly.filter(propSub);
            var lc_dic = {
                land_class: randomSample70.first()
                    .get("land_class")
            };
            var m_poly = randomSample70.geometry();
            return ee.Feature(m_poly, lc_dic);
        }));


    var landClassImage = ee.Image().byte().paint(land_features, property)
        .rename(property);

    var stratified = landClassImage.addBands(ee.Image.pixelLonLat())
        .stratifiedSample(
            {
                seed: seed,
                numPoints: nP,
                classBand: property,
                scale: 1,
                region: land_features.geometry()
            }).map(function (f) {
                return f.setGeometry(ee.Geometry
                    .Point([f.get("longitude"),
                    f.get("latitude")
                    ]));
            });
    return stratified;
}

/**
 * Add satellite layers to the display
 * */
function displayAddSatellite(displayLayers, theComposite,
    imageCollection, index, n) {
    for (var ii = index; ii < index + n; ++ii)
        displayLayers[ii] = Map.addLayer(theComposite, getVizParams(
            imageCollection, ii, bn.b04, bn.b03, bn.b02), "Period " + (ii -
                index + 1), false);
}

/**
 * Add terrain layers to the display
 * */
function displayAddTerrain(displayLayers, index) {
    displayLayers[index] =
        Map.addLayer(terrain.height(),
            {
                min: 0,
                max: 2000
            }, "Height", false);
    displayLayers[index + 1] =
        Map.addLayer(terrain.aspect(),
            {
                min: 0,
                max: 360
            }, "Aspect", false);
    displayLayers[index + 2] =
        Map.addLayer(terrain.slope(),
            {
                min: 0,
                max: 90
            }, "Slope", false);
}

/**
 * Not implemented yet
 * */
function displayAddContext() {
    return null;
}

/**
 * Draw the AOI
 * */
function drawAOI(theAOIMap, theAOI, colour) {
    var myAOIMap = theAOIMap;
    try {
        Map.remove(myAOIMap);
    }
    catch (error) { }
    myAOIMap = drawObject(theAOI, colour, "Area of Interest");
    return myAOIMap;
}

/**
 * Draw the classification.  You might wish to call this when you have changed
 * the colour palette but do not wish to reclassify
 * */
function drawClassifiedMap(classifiedPixels, classifiedMap, thePalette) {
    var theClassifiedMap = classifiedMap;
    //var thePalette = setPalette(Map);
    try {
        Map.remove(theClassifiedMap);
    }
    catch (error) {
        //Do Nothing!
    }
    try {
        theClassifiedMap =
            Map.addLayer(classifiedPixels,
                {
                    palette: thePalette,
                    min: 1,
                    max: thePalette.length
                },
                "The classification");
    }
    catch (error) {
        print("drawClassifiedMap: something went wrong", error.message);
    }
    return theClassifiedMap;
}

/**
 * Draws a colour outline around the object.
 * */
function drawObject(obj, colour, title) {
    var drawn = null;
    try {
        var empty = ee.Image().byte();
        var outline = empty.paint(
            {
                featureCollection: obj,
                color: 1,
                width: 3
            });
        drawn = Map.addLayer(outline,
            {
                palette: colour
            }, title);
    }
    catch (error) {
        print("drawObject: something went wrong", error.message);
    }
    return drawn;
}

/*
 * Retreive legend data and add to panel
 */
function makeLegend(legend) {
    try {
        Map.remove(legend);
    }
    catch (error) {
        // message
    }
    // set position of panel
    legend = ui.Panel(
        {
            style:
            {
                position: "bottom-right",
                padding: "8px 15px"
            }
        });
    // Create legend title
    var legendTitle = ui.Label(
        {
            value: "Land Cover",
            style:
            {
                fontWeight: "bold",
                fontSize: "18px",
                margin: "0 0 4px 0",
                padding: "0"
            }
        });
    // Add the title to the panel
    legend.add(legendTitle);
    // Creates and styles 1 row of the legend.
    var makeRow = function (colour, name) {
        // Create the label that is actually the coloured box.
        var colourBox = ui.Label(
            {
                style:
                {
                    backgroundColor: colour,
                    // Use padding to give the box height and width.
                    padding: "8px",
                    margin: "0 0 4px 0"
                }
            });
        // Create the label filled with the description text.
        var description = ui.Label(
            {
                value: name,
                style:
                {
                    margin: "0 0 4px 6px"
                }
            });
        // return the panel
        return ui.Panel(
            {
                widgets: [colourBox, description],
                layout: ui.Panel.Layout.Flow("horizontal")
            });
    };
    var palette = getPaletteColours(Map.drawingTools().layers(), getLandClass());
    var names = getPaletteNames(Map.drawingTools().layers(), getLandClass());
    for (var ii = 0; ii < ee.List(palette).length().getInfo(); ++ii) {
        legend.add(makeRow(palette[ii], names[ii]));
    }
    return legend;
}



/**
 * Mask clouds using the Sentinel-2 QA band.
 * */
function maskS2clouds(image) {
    var qa = image.select("QA60");
    // Bits 10 and 11 are clouds and cirrus, respectively.
    var cloudBitMask = Math.pow(2, 10);
    var cirrusBitMask = Math.pow(2, 11);
    // Both flags should be set to zero, indicating clear conditions.
    var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(
        qa.bitwiseAnd(cirrusBitMask).eq(0));
    // Return the masked and scaled data.
    return image.updateMask(mask).divide(10000);
}

/**
 * Mask clouds based on the pixel_qa band of Landsat 8 SR data.
 * */
function maskL8SRclouds(image) {
    // Get the pixel QA band.
    var qa = image.select("pixel_qa");
    // Bits 3 and 5 are cloud shadow and cloud, respectively.
    var cloudShadowBitMask = (1 << 3);
    var cloudsBitMask = (1 << 5);
    // Both flags should be set to zero, indicating clear conditions.
    var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0).and(qa.bitwiseAnd(
        cloudsBitMask).eq(0));
    return image.updateMask(mask);
}

/**
 * Mask clouds using the Landsat-8 BQA band.
 * */
function maskL8TOAclouds(image) {
    var qa = image.select("BQA");
    // Bits 4 is clouds
    var cloudBitMask = Math.pow(2, 4);
    // Both flags should be set to zero, indicating clear conditions.
    var mask = qa.bitwiseAnd(cloudBitMask).eq(0);
    // Return the masked and scaled data.
    return image.updateMask(mask); //
}

/**
 * Purge all map layers
 **/
function purgeDisplayLayers(displayLayers) {
    if (displayLayers !== null) {
        for (var ii = 0; ii < displayLayers.length; ++ii)
            removeMapLayer(displayLayers[ii]);
    }
    return null;
}

/*
 * Re-centre the aoi
 */
function reCentre() {
    try {
        return Map.centerObject(getAOI(Map.drawingTools().layers()));
    }
    catch (error) {
        return null;
    }
}

/**
 * remove a layer from the map display
 * */
function removeMapLayer(layer) {
    try {
        Map.remove(layer);
    }
    catch (error) {
        return 0;
    }
    print("layer removed:", layer);
    return 1;
}


/**
 * Remove a property from a feature.  Use within a map to apply to a feature
 * collection
 * */
var removeProperty = function (feat, property) {
    var properties = feat.propertyNames();
    var selectProperties = properties.filter(ee.Filter.neq("item",
        property));
    return feat.select(selectProperties);
};

/**
 * Display the stack layers
 * */
function showStack(imageCollection, theComposite, displayLayers) {
    displayLayers = purgeDisplayLayers(displayLayers);

    var sLength = getNumberOfIntervals();
    var tLength = getNumberOfTerrainLayers();
    var cLength = getNumberOfContextLayers();
    displayLayers = new Array(sLength + tLength);

    displayAddSatellite(displayLayers, theComposite, imageCollection, 0,
        sLength);
    displayAddContext(displayLayers, sLength);
    displayAddTerrain(displayLayers, sLength + cLength);

    ymyw.setAoiMap(drawAOI(ymyw.aoiMap, getAOI(Map.drawingTools().layers()),
        ymyw.borderColour));

    return displayLayers;
}


function validateClassification(validationPoints, theComposite, randomForest) {
    var validationPointsData = getLabeledPixels(theComposite,
        validationPoints,
        getLandClass());
    var validated = validationPointsData.classify(randomForest);
    ymyw.setTestAccuracy(validated.errorMatrix(getLandClass(), "classification"));
    print("Correspondence matrix: ", ymyw.testAccuracy);
    print("Overall accuracy: ", ymyw.testAccuracy.accuracy());
    print("Consumer's accuracy", ymyw.testAccuracy.consumersAccuracy());
    print("Producer's accuracy", ymyw.testAccuracy.producersAccuracy());
    print("Kappa", ymyw.testAccuracy.kappa());
}


/**
 * This does it!
 */
function main() {
    var propSubExpression = ee.String("<= ").cat(ee.Number(1).subtract(ee
        .Number(ymyw.propVali).divide(ee.Number(100))));
    var layers = Map.drawingTools().layers();

    ymyw.setImageStack(getStack(ymyw.collectionName));
    ymyw.setDisplayLayers(showStack(ymyw.collectionName, ymyw.imageStack,
        ymyw.displayLayers));
    //	ymyw.setLayers(Map.drawingTools().layers());

    // build training dataset for each land_class
    print(ee.String("Training with ")
        .cat(ee.Number(100)
            .subtract(ee.Number(ymyw.propVali)))
        .cat(ee.String("% of the training chips and ")
            .cat(ee.Number(ymyw.nTrainPoints))
            .cat(ee.String(" points per class"))));

    ymyw.setTrainingPoints(createDataPoints(layers, ymyw.nTrainPoints,
        ymyw.trainingSeed, getLandClass(), propSubExpression,
        ymyw.valSeed));

    ymyw.setTrainingData(getLabeledPixels(ymyw.imageStack, ymyw.trainingPoints,
        getLandClass()));

    //Build the classifier
    ymyw.setRandomForest(buildRandomForest(ymyw.trainingData, ymyw.nTrees,
        getLandClass(), ymyw.trainingData.get("band_order")));

    // classify the Area of Interest with the trained classifier
    ymyw.setClassifiedPixels(classifyAOI(ymyw.imageStack, ymyw.randomForest,
        getAOI(layers)));

    // draw classification and its legend on the map
    ymyw.setAoiMap(drawAOI(ymyw.aoiMap, layers, ymyw.borderColour));
    ymyw.setClassifiedMap(drawClassifiedMap(ymyw.classifiedPixels,
        ymyw.classifiedMap, getPaletteColours(layers, getLandClass())));
    Map.add(ymyw.setLegend(makeLegend(ymyw.legend)));
}

// ### >>> GUI elements <<< ###

// Side panel
var classificationPanel = ui.Panel(
    {
        layout: ui.Panel.Layout.flow("vertical"),
        style:
        {
            width: "320px",
            backgroundColor: colour.grey,
            position: "bottom-left"
        }
    });
// Add it to map
ui.root.insert(0, classificationPanel);

// YMYW banner
var banner = ui.Panel(
    {
        layout: ui.Panel.Layout.flow("vertical"),
        style:
        {
            width: "280px",
            backgroundColor: colour.transparent,
            position: "bottom-left"
            //shown: false
        }
    });
Map.add(banner);

// Title and description.
var intro = ui.Label(getTitle(),
    {
        fontWeight: "bold",
        color: colour.title,
        fontSize: "18px",
        margin: "0px 0px",
        backgroundColor: colour.transparent
    });
banner.add(intro);

// Selection menus and sliders parameters
var labelStyle = {
    fontSize: "12px",
    color: colour.blue,
    fontWeight: "bold"
};
// Define the select button for the AOI
var selectImageCollectionLabel = ui.Label(
    {
        value: "Select image collection",
        style: labelStyle
    });

var selectImageCollection = ui.Select(
    {
        items: [satelliteCollection.L8SR,
        satelliteCollection.L8TOA,
        satelliteCollection.S2SR,
        satelliteCollection.S2TOA
        ],
        placeholder: ymyw.collectionName,
        onChange: setCollectionCallback
    });

classificationPanel.add(selectImageCollectionLabel).add(selectImageCollection);

// Date selection
var selectStartDateLabel = ui.Label(
    {
        value: "Select start of classification year",
        style: labelStyle
    });
var dateSliderStartDate = ui.DateSlider(
    {
        start: getCalStartDate(ymyw.collectionName),
        end: ee.Date(Date.now()),
        value: ymyw.baseDate,
        period: 1,
        onChange: setStartDateCallback
    });
classificationPanel.add(selectStartDateLabel).add(dateSliderStartDate);

// Composite label
var setIntervalsLabel = ui.Label(
    {
        value: "Set intervals",
        style: labelStyle
    });
var textBoxSetIntervals = ui.Textbox(
    {
        onChange: function (value) {
            textBoxSetIntervals.setValue(value);
            ymyw.setIntervals(value);
        }
    });


textBoxSetIntervals.setValue(ymyw.intervals);
classificationPanel.add(setIntervalsLabel).add(textBoxSetIntervals);

// Cloud tolerance
var selectCloudLabel = ui.Label(
    {
        value: "% Cloud tolerance",
        style: labelStyle
    });

var sliderCloud = ui.Slider(
    {
        min: 0,
        max: 100,
        value: ymyw.cloud,
        step: 10,
        style:
        {
            stretch: "horizontal",
            width: "300px"
        }
    });

sliderCloud.onChange(setCloudCallback);
classificationPanel.add(selectCloudLabel).add(sliderCloud);

// Random Forest N trees
var selectRFTreeLabel = ui.Label(
    {
        value: "RF: Number of trees",
        style: labelStyle
    });

var sliderTrees = ui.Slider(
    {
        min: 10,
        max: 500,
        value: ymyw.nTrees,
        step: 10,
        style:
        {
            stretch: "horizontal",
            width: "300px"
        }
    });

sliderTrees.onChange(setTreesCallback);
classificationPanel.add(selectRFTreeLabel).add(sliderTrees);

// Training points N
var selectTrainLabel = ui.Label(
    {
        value: "RF: Number of training points/class",
        style: labelStyle
    });

var sliderTrain = ui.Slider(
    {
        min: 100,
        max: 10000,
        value: ymyw.nTrainPoints,
        step: 100,
        style:
        {
            stretch: "horizontal",
            width: "300px"
        }
    });

sliderTrain.onChange(setTrainCallback);
classificationPanel.add(selectTrainLabel).add(sliderTrain);

// Validation
var selectPropValiLabel = ui.Label(
    {
        value: "Validation (%)",
        style: labelStyle
    });

var sliderPropVali = ui.Slider(
    {
        min: 10,
        max: 50,
        value: ymyw.propVali,
        step: 5,
        style:
        {
            stretch: "horizontal",
            width: "300px"
        }
    });

sliderPropVali.onChange(setPropValiCallback);
classificationPanel.add(selectPropValiLabel).add(sliderPropVali);


// ### >>> GUI Buttons <<< ###

// view composites layers
var showStackButton = ui.Button(
    {
        label: "Show layers"
    });
showStackButton.onClick(showStackCallback);
classificationPanel.add(showStackButton);

// classify
var classifyButton = ui.Button(
    {
        label: "Classify"
    });
classifyButton.onClick(classifySceneCallback);
classificationPanel.add(classifyButton);

// Add recentre to panel
var recentreButton = ui.Button("Recentre");
recentreButton.onClick(reCentre);
classificationPanel.add(recentreButton);

// Add redraw button to panel
var redrawButton = ui.Button("Redraw");
redrawButton.onClick(reDrawClassifiedCallback);

// Add variable importance button to panel
var variableImportanceButton = ui.Button("Variable importance (RF)");
variableImportanceButton.onClick(variableImportanceCallback);

// Add variable importance button to panel
var oobButton = ui.Button("Out of bag error (RF)");
oobButton.onClick(oobCallback);

// Add validation button to panel
var validationButton = ui.Button("Validate classification");
validationButton.onClick(validateCallback);

// Add export button to panel
var exportButton = ui.Button("Export classification and more");
exportButton.onClick(exportCallback);

// ### >>> GUI callback functions <<< ###

/**
 * Classify AOI - run RF classifier
 * */
function classifySceneCallback() {
    print("Classifying scene...");
    main();
    // redraw AOI on top of classification
    var layers = Map.drawingTools().layers();
    ymyw.setAoiMap(drawAOI(ymyw.aoiMap, getAOI(layers), ymyw.borderColour));
    try {
        classificationPanel.add(redrawButton);
        classificationPanel.add(oobButton);
        classificationPanel.add(variableImportanceButton);
        classificationPanel.add(validationButton);
        classificationPanel.add(exportButton);
    }
    catch (error) {
        //print("classifyScenceCallback: something went wrong:", error.message);
    }
}

/**
 * Export outputs
 * */
function exportCallback() {
    //Export the classified image for the Area Of Interest
    Export.image.toDrive(
        {
            image: ymyw.classifiedPixels,
            description: "classified_aoi".toString(),
            region: aoi.bounds(),
            maxPixels: 1e13,
            crs: ymyw.EPSG,
            scale: ymyw.resolution
        });
    // Export the composite images for the Area of Interest
    Export.image.toDrive(
        {
            image: ymyw.imageStack,
            description: "composite_aoi".toString(),
            region: aoi.bounds(),
            maxPixels: 1e13,
            crs: ymyw.EPSG,
            scale: ymyw.resolution
        });
    var fMap = function (f) {
        return ee.Feature(f.getEeObject());
    };
    // Export the drawn objects to a file.
    Export.table.toDrive(
        {
            collection: ee.FeatureCollection(Map.drawingTools().layers()
                .map(fMap)),
            description: "layers",
            fileFormat: "KML"
        });
    // Export the points for training
    Export.table.toDrive(
        {
            collection: ymyw.trainingPoints,
            description: "trainingPoints",
            fileFormat: "KML"
        });
    // Export the points for validation
    if (getValidationPoints() !== null) {
        Export.table.toDrive(
            {
                collection: ymyw.validationPoints,
                description: "validationPoints",
                fileFormat: "KML"
            });
    }
    // Export the error matrix from validation
    if (ymyw.testAccuracy !== null) {
        var exportAccuracy = ee.Feature(null,
            {
                matrix: ymyw.testAccuracy.array()
            });
        Export.table.toDrive(
            {
                collection: ee.FeatureCollection(exportAccuracy),
                description: "ErrorMatrix",
                fileFormat: "CSV"
            });
    }
}

/**
 * Redraw the classified map but do not reclassify
 * */
function reDrawClassifiedCallback() {
    var layers = Map.drawingTools().layers();
    //ymyw.setAoiMap(drawAOI(ymyw.aioMap, getAOI(layers), ymyw.borderColour));
    ymyw.setClassifiedMap(drawClassifiedMap(ymyw.classifiedPixels, ymyw.classifiedMap,
        getPaletteColours(layers, getLandClass())));
    try {
        Map.add(ymyw.setLegend(makeLegend(ymyw.legend)));
    }
    catch (error) {
        print("reDrawClassifiedCallback: something went wrong", error);
    }
}


/**
 * Get cloud tolearance
 * */
function setCloudCallback() {
    var sliderVal = sliderCloud.getValue();
    ymyw.setCloud(sliderVal);
}

/**
 * Set collection
 * */
function setCollectionCallback(value) {
    ymyw.setCollectionName(value);
    ymyw.setBands(getBands(ymyw.collectionName));
    ymyw.setResolution(getResolution(ymyw.collectionName));
}

/**
 * set validation points
 * */
function setPropValiCallback() {
    var sliderVal = sliderPropVali.getValue();
    ymyw.setPropVali(sliderVal);
    ymyw.setNValidPoints(ee.Number(ymyw.nTrainPoints))
        .multiply(ee.Number(sliderVal)).divide(ee.Number(100)
            .subtract(ee.Number(sliderVal))).round().toInt();
}

/**
 * Set start date
 * */
function setStartDateCallback(date) {
    print("Setting date");
    print("date", date.start());
    ymyw.setBaseDate(date.start());
    print("ymyw.date", ymyw.baseDate);
}

/**
 * Set training and validation points
 * */
function setTrainCallback() {
    var sliderVal = sliderTrain.getValue();
    ymyw.setNTrainPoints(sliderVal);
    ymyw.setNValidPoints(ee.Number(ymyw.nTrainPoints).multiply(ee.Number(
        ymyw.propVali)).divide(ee.Number(100).subtract(ee.Number(
            ymyw.propVali))).round().toInt());
}

/**
 * Set RF tree number
 * */
function setTreesCallback() {
    var sliderVal = sliderTrees.getValue();
    ymyw.setNTrees(sliderVal);
}

/**
 * Show stack
 * */
function showStackCallback() {
    print("Show scene...");
    ymyw.setImageStack(getStack(ymyw.collectionName));
    ymyw.setDisplayLayers(showStack(ymyw.collectionName,
        ymyw.imageStack, ymyw.displayLayers));
}

function textBoxSetIntervalsCallback(value) {

}

/**
 * Validate classification
 * */
function validateCallback() {
    print("validate classification...");
    // generate stratified validation points
    print(ee.String("Cross-Validate with ").cat(ee.Number(ymyw.propVali))
        .cat(ee.String("% of the training chips and ")
            .cat(ee.Number(ymyw.nValidPoints).toInt())
            .cat(ee.String(" points per class"))));
    var layers = Map.drawingTools().layers();
    var propSubExpression = ee.String("> ").cat(ee.Number(1)
        .subtract(ee.Number(ymyw.propVali)
            .divide(ee.Number(100))));
    ymyw.setValidationPoints(createDataPoints(layers, ymyw.nValidPoints, ymyw.validationSeed,
        getLandClass(), propSubExpression, ymyw.valSeed));
    validateClassification(ymyw.validationPoints, ymyw.imageStack,
        ymyw.randomForest);
}


/**
 * Determine variable importance and print to console
 * */
function variableImportanceCallback() {
    var vi = null;
    try {
        vi = ee.Dictionary(ymyw.randomForest.explain()).get("importance");
    }
    catch (error) {
        print("Variable Importance: something went wrong", error);
        return null;
    }
    var vimp = ee.Feature(null, vi);
    var chart =
        ui.Chart.feature.byProperty(vimp)
            .setChartType("ColumnChart")
            .setOptions(
                {
                    title: "Random Forest Variable Importance",
                    legend:
                    {
                        position: "none"
                    },
                    hAxis:
                    {
                        title: "Bands"
                    },
                    vAxis:
                    {
                        title: "Importance"
                    }
                });
    print(chart);
    print("Variable Importance:", vi);
    return vi;
}

/**
 * Display out of bag (oob) statistic
 * */
function oobCallback() {
    var oob = null;
    try {
        oob = ee.Dictionary(ymyw.randomForest.explain())
            .get("outOfBagErrorEstimate");
    }
    catch (error) {
        print("oobCallback: something went wrong", error);
        return null;
    }
    print("Out of bag error estimate = ", oob);
    return oob;
}

/**
 * The End  :-)
 * */