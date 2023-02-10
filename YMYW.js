/*
 * Your Maps Your Way (YMYW), a generic land cover  classification. This script allows an interactive classification 
 * of land cover. The user must first specify an area of interest (AOI) and then digitise training chips of different
 * land cover classes. Once the training areas for the each land cover classes are digitised, the user can perform 
 * the classification, training a Random Forest classifier. The result classification is drawn on the screen within
 * the AOI. To revise, refine, delete or add more training chips, then run the classification again.
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
 * training observations is provided for each land cover class, regardless of land cover. This avoids bias and
 * ensures that rarer classes are not underrepresented in the classification. Once the classification is complete,
 * you can validate your classification (Validate classification). The cross-validation uses a set of points drawn 
 * from chips that were not used to train the classifier.
 * 
 * 
 * Authors: Dan Morton & Reto Schmucki
 * Version: 1.0.0
 * Date: 30/01/2023
 * Licence: MIT Licence, Copyright (c) 2023 UK Centre for Ecology & Hydrology
 * 
*/

/* ###########################################
 * SET YOUR PARAMETERS HERE (change defaults)
 * Delete or add space between the "*" and "/" 
 * at the begining of the line below to enable
 * or disable the parameter setting.
 * ###########################################

* /  // DELETE or ADD space between "*" and "/"
var intervals = '0,3:3,6:6,9:9,12';
var baseDate = ee.Date('2021-01-01')
var MyImageCollection = 'COPERNICUS/S2_SR'

/* Chose from four ImageCollection, default = 'COPERNICUS/S2_SR': 
  'COPERNICUS/S2'
  'COPERNICUS/S2_SR'
  'LANDSAT/LC08/C01/T1_TOA'
  'LANDSAT/LC08/C01/T1_SR'
*/

// ### >> YMYW CODE << ###

// ### >>> VARIABLES <<< ###
// Title
var theTitle = 'UKCEH: Your Maps Your Way (YMYW)';
// season - period interval in months from period 1 to n
if (typeof intervals === 'undefined') {
    var intervals = '0,3:3,6:6,9:9,12';
}
// start date - default starting last year 
if (typeof baseDate === 'undefined') {
    var baseDate = ee.Date(Date.now()).advance(-1, 'year').advance(-1, 'day'); // set start date to last year
}
// Create three terrain layers, height, aspect, slope
var srtm = ee.Image("USGS/SRTMGL1_003");
var height = srtm.select('elevation').toInt16();
var slope = ee.Terrain.slope(height).toInt16();
var aspect = ee.Terrain.aspect(height).toInt16();
var terrain = height.addBands(slope).addBands(aspect);
//Constants
var colors = {
    'cyan': '#24C1E0',
    'transparent': '#11ffee00',
    'gray': '#F8F9FA',
    'red': '#ff0000',
    'black': '#000000',
    'blue': '#0000ff',
    'title': '#F2F2F2'
};
var property = "land_class";
var epsg = 'epsg:4326';
var L8TOA = 'LANDSAT/LC08/C01/T1_TOA';
var L8SR = 'LANDSAT/LC08/C01/T1_SR';
var S2TOA = 'COPERNICUS/S2';
var S2SR = 'COPERNICUS/S2_SR';
var median = 'median';
var mean = 'mean';
var bb = ['', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11', 'B12'];
var sentinel2Bands = [bb[2], bb[3], bb[4], bb[5], bb[6], bb[7], bb[8], bb[11], bb[12]];
var landsat8Bands = [bb[2], bb[3], bb[4], bb[5], bb[6], bb[7]];
var aoiBorderColour = colors.blue;
var sentinel2Resolution = 10;
var landsat8Resolution = 30;
// Set default for sliders and seeds
var cloud = 30; // Cloud tolerance (%) per image
var nTrees = 100; // Number of trees in forest
var nTrainPoints = 1400; // Number of points to generate per training class
var nValidPoints = 600; // Number of points to generate per training class
var PropCrossVali = 30; // Percentage of training chips used for Cross-Validation
var trainingSeed = 7638; // Seed for random number generation for training dataset
var validationSeed = 2982; // Seed for random number generation for validation dataset
var crossValSeed = 0; // Seed for random number generation for dividing proportion of classification chips
// Globals with set default values
var stat = median;
// set Image Collection and available calendar dates
if (typeof MyImageCollection === 'undefined') {
    var satelliteImageCollection = S2SR;
} else {
    var satelliteImageCollection = MyImageCollection;
}
var calStartDate = null;
switch (satelliteImageCollection) {
    // Sentinel-2
    case S2SR:
    case S2TOA:
        calStartDate = '2017-01-01';
        break;
    // Landsat-8
    case L8SR:
    case L8TOA:
        calStartDate = '2014-01-01';
        break;
}
// Global variables, unset
var bands = null;
var trainingPoints = null;
var randomPoints = null;
var trainingData = null;
var validationPoints = null;
var testAccuracy = null;
var randomForest = null;
var classifiedMap = null;
var classifiedPixels = null;
var probabilityPixels = null;
var aoiMap = null;
var legend = null;
var resolution = null;
var seasonalComposite = null;
var bandOrder = null;
var satelliteLayers = null;
var heightLayer = null;
var aspectLayer = null;
var slopeLayer = null;
var validationData = null;
// Draw the AOI if it exists
aoiMap = drawAOI(aoiMap, getAOI(Map.drawingTools().layers()));
reCentre();
var layers = Map.drawingTools().layers();
// Print centroid and area of AOI in Km2 to the console.
print('AOI centroid =', aoi.centroid({ 'maxError': 1 }));
var aoiArea = aoi.area({ 'maxError': 1 });
print('AOI area Km2 =', aoiArea.divide(ee.Number(1000000)).round());

// ### >>> FUNCTIONS <<< ###

/*
 * Classifier workhorse
 */
function main() {
    // get seasonal composite of satelite images
    showcomposite()
    var layers = Map.drawingTools().layers();
    var theAOI = getAOI(layers);
    // build training dataset for each land_class
    print(ee.String('Training with ').cat(ee.Number(100).subtract(ee.Number(PropCrossVali))).cat(ee.String('% of the training chips and ').cat(ee.Number(nTrainPoints)).cat(ee.String(' points per class'))));
    var prop_sub_expression = ee.String('<= ').cat(ee.Number(1).subtract(ee.Number(PropCrossVali).divide(ee.Number(100))));
    trainingPoints = createDataPoints(layers, nTrainPoints, trainingSeed, property, prop_sub_expression, crossValSeed);
    trainingData = createTrainingData2(seasonalComposite, trainingPoints, property);
    bandOrder = trainingData.get('band_order');
    // train random forest classifier
    randomForest = trainClassifier(trainingData, nTrees, property, bandOrder);
    // classify the Area of Interest with the trained classifier
    classifiedPixels = classifyAOI(seasonalComposite, randomForest, theAOI);
    // draw classification and its legend on the map
    aoiMap = drawAOI(aoiMap, theAOI);
    classifiedMap = drawClassifiedMap(classifiedPixels, classifiedMap, getPalette(layers, property));
    Map.add(legend = getLegend(legend));
}

/*
 * Gatter satelite images, compute seasonal composite and display images on the map
 */
function showcomposite() {
    var imageCollection = selectImageCollection.getValue();
    if (imageCollection === null) {
        imageCollection = satelliteImageCollection;
    }
    satelliteImageCollection = imageCollection;
    switch (satelliteImageCollection) {
        // Sentinel-2
        case S2SR:
        case S2TOA:
            resolution = sentinel2Resolution;
            bands = sentinel2Bands;
            break;
        // Landsat-8
        case L8SR:
        case L8TOA:
            resolution = landsat8Resolution;
            bands = landsat8Bands;
            break;
    }
    var s = getDateFilters(textBoxDefineComposites.getValue());
    for (var ii = 0; ii < s.length; ++ii) {
        var c = getComposite(satelliteImageCollection, cloud, bands, s[ii], stat);
        seasonalComposite = (ii === 0) ? c : seasonalComposite.addBands(c);
    }
    seasonalComposite = seasonalComposite.addBands(terrain);
    try {
        for (ii = 0; ii < satelliteLayers.length; ++ii) {
            Map.remove(satelliteLayers[ii]);
        }
        Map.remove(heightLayer);
        Map.remove(slopeLayer);
        Map.remove(aspectLayer);
    }
    catch (error) {
        // message 
    }
    satelliteLayers = new Array(s.length);
    for (ii = 0; ii < satelliteLayers.length; ++ii) {
        satelliteLayers[ii] = Map.addLayer(seasonalComposite, getVizParams(satelliteImageCollection, ii, bb[4], bb[3], bb[2]), 'Period ' + (ii + 1), false);
    }
    heightLayer = Map.addLayer(height, { min: 0, max: 2000 }, 'Height', false);
    aspectLayer = Map.addLayer(aspect, { min: 0, max: 360 }, 'Aspect', false);
    slopeLayer = Map.addLayer(slope, { min: 0, max: 90 }, 'Slope', false);
    aoiMap = drawAOI(aoiMap, getAOI(Map.drawingTools().layers()));
    print('Area of Interest (AOI) =', getAOI(Map.drawingTools().layers()));
}

/*
 * Remove a property from a feature.  Use within a map to apply to a feature collection
 */
var removeProperty = function (feat, property) {
    var properties = feat.propertyNames();
    var selectProperties = properties.filter(ee.Filter.neq('item', property));
    return feat.select(selectProperties);
};

/*
 * Parse interval string return an array of date filters.
 */
function getDateFilters(iString) {
    var splTxt = iString.split(':');
    var outArray = new Array(splTxt.length);
    for (var ii = 0; ii < splTxt.length; ++ii) {
        var sp = splTxt[ii].split(',');
        var start = parseInt(sp[0], 10);
        var end = parseInt(sp[1], 10);
        outArray[ii] = ee.Filter.date(baseDate.advance(start, 'month'), baseDate.advance(end, 'month'));
        print(outArray[ii]);
    }
    return outArray;
}

/*
 * Get the vizualisation parameters for specific seasonal composites.  
 */
function getVizParams(imageCollection, season, r, g, b) {
    var bands = null;
    if (season > 0) {
        r += '_' + season;
        g += '_' + season;
        b += '_' + season;
    }
    //specific dispaly/vizualisation parameters
    switch (imageCollection) {
        case S2TOA:
            return {
                bands: [r, g, b],
                min: 0,
                max: 500,
                gamma: [0.95, 1.1, 1]
            };
        case S2SR:
            return {
                bands: [r, g, b],
                min: 0,
                max: 500,
                gamma: [0.95, 1.1, 1]
            };
        case L8TOA:
            return {
                bands: [r, g, b],
                min: 0,
                max: 400,
                gamma: [0.95, 1.1, 1]
            };
        case L8SR:
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
 * Mask clouds using the Sentinel-2 QA band.
 */
function maskS2clouds(image) {
    var qa = image.select('QA60');
    // Bits 10 and 11 are clouds and cirrus, respectively.
    var cloudBitMask = Math.pow(2, 10);
    var cirrusBitMask = Math.pow(2, 11);
    // Both flags should be set to zero, indicating clear conditions.
    var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(
        qa.bitwiseAnd(cirrusBitMask).eq(0));
    // Return the masked and scaled data.
    return image.updateMask(mask).divide(10000);
}

/*
 * Mask clouds using the Landsat-8 BQA band.
 */
function maskL8TOAclouds(image) {
    var qa = image.select('BQA');
    // Bits 4 is clouds
    var cloudBitMask = Math.pow(2, 4);
    // Both flags should be set to zero, indicating clear conditions.
    var mask = qa.bitwiseAnd(cloudBitMask).eq(0);
    // Return the masked and scaled data.
    return image.updateMask(mask); // 
}

/*
 * Mask clouds based on the pixel_qa band of Landsat 8 SR data.
 */
function maskL8SRclouds(image) {
    // Get the pixel QA band.
    var qa = image.select('pixel_qa');
    // Bits 3 and 5 are cloud shadow and cloud, respectively.
    var cloudShadowBitMask = (1 << 3);
    var cloudsBitMask = (1 << 5);
    // Both flags should be set to zero, indicating clear conditions.
    var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
        .and(qa.bitwiseAnd(cloudsBitMask).eq(0));
    return image.updateMask(mask);
}

/*
 * Generic get composite function.  
 */
function getComposite(imageCollection, cloudCover, bands, season, stat) {
    var img = null;
    img = getCollection(imageCollection, cloudCover, bands, season);
    switch (stat) {
        case median:
            img = img.median();
            break;
        case mean:
            img = img.mean();
            break;
    }
    if (img === null) return null;
    // Put it in int16 for smaller export
    switch (imageCollection) {
        case S2SR:
        case S2TOA:
        case L8TOA:
            return img.unmask().multiply(1000).toInt16();
        case L8SR:
            return img.unmask().multiply(1).toInt16();
    }
}

/*
 * Get image collection with specific cloud mask  
 */
function getCollection(imageCollection, cloudCover, bands, season) {
    var cloudParam = null;
    var maskFunction = null;
    switch (imageCollection) {
        case S2SR:
        case S2TOA:
            cloudParam = 'CLOUDY_PIXEL_PERCENTAGE';
            maskFunction = maskS2clouds;
            break;
        case L8SR:
            cloudParam = 'CLOUD_COVER';
            maskFunction = maskL8SRclouds
            break;
        case L8TOA:
            cloudParam = 'CLOUD_COVER';
            maskFunction = maskL8TOAclouds
            break;
    }
    var img = ee.ImageCollection(imageCollection)
        .filter(season)
        .filter(ee.Filter.lt(cloudParam, cloudCover))
        .map(maskFunction)
        .select(bands);
    print('All metadata:', img.filterBounds(aoi.centroid({ 'maxError': 1 })));
    return img;
}

/*
 * Draws a colour outline around the object.
 */
function drawObject(obj, colour, title) {
    var drawn = null;
    try {
        var empty = ee.Image().byte();
        var outline = empty.paint({
            featureCollection: obj,
            color: 1,
            width: 3
        });
        drawn = Map.addLayer(outline, { palette: colour }, title);
    }
    catch (error) {
        print('Something went wrong');
    }
    return drawn;
}

/*
 * Returns a collection of 'n' labelled points randomly placed across a multipolygon,
 * representing land cover type. These are used to sample pixels for classifier 
 * training.  
 */
function generatePoints(feature, n, seed, property) {
    var value = null;
    try {
        value = ee.Feature(feature).get(property);
    }
    catch (error) {
        print('You need to digitise features with integer property,', property);
    }
    if (!value) return null;
    var randomPoints = ee.FeatureCollection.randomPoints(ee.FeatureCollection(feature), n, seed);
    return randomPoints.map(function (point) { return ee.Feature(point).set(property, value); });
}

/*
 * Gets AOI
 */
function getAOI(layers) {
    try {
        return layers.filter(function (l) {
            var str = l.get('name');
            if (str === 'aoi') return l;
        })[0].getEeObject();
    }
    catch (error) {
        throw ('Error - Draw a rectangle polygon and name it "aoi" to define the Area of Interest');
    }
}

/*
 * Gets the palette names.
 */
function getNames(layers, property) {
    var names = new Array(layers.length);
    var fMap = function (f) {
        var name = f.get('name');
        if (name === 'aoi') return null;
        var o = f.getEeObject();
        var value = o.get(property);
        if (!value) return null;
        names[value.getInfo() - 1] = name;
        return null;
    };
    layers.map(fMap);
    return names;
}

/*
 * Gets the palette colours according to drawn layers.
 */
function getPalette(layers, property) {
    var palette = [colors.black];
    for (var ii = 1; ii < layers.length() - 1; ++ii) {
        palette.push(colors.black);
    }
    var f_map = function (f) {
        var name = f.get('name');
        if (name === 'aoi') return null;
        var colour = f.get('color');
        var value = f.getEeObject().get(property);
        if (!value) return null;
        palette[value.getInfo() - 1] = colour;
        return null;
    };
    layers.map(f_map);
    return palette;
}

/*
 * Create points from classification chips draw
 */
function createDataPoints(layers, nP, seed, property, prop_sub, crossValSeed) {
    prop_sub = ee.String('random ').cat(prop_sub);
    var multipoly2poly = function (feature) {
        var multipoly = feature.geometry();
        var size = multipoly.coordinates().size();
        var polylist = ee.List.sequence(0, size.add(-1), 1)
            .map(function (listelem) {
                return ee.Feature(feature)
                    .setGeometry(ee.Geometry.Polygon(multipoly.coordinates().get(listelem)));
            });
        return ee.FeatureCollection(polylist).randomColumn('random', crossValSeed, 'uniform');
    };
    var trainingObjects = layers.filter(
        function (l) {
            if (l.getEeObject().name() === 'Feature') return l;
        });
    var land_features = ee.FeatureCollection(trainingObjects.map(
        function (f) {
            var poly_ = f.getEeObject();
            poly_ = multipoly2poly(poly_);
            var randomSample70 = poly_.filter(prop_sub);
            var lc_dic = { land_class: randomSample70.first().get('land_class') };
            var m_poly = randomSample70.geometry();
            return ee.Feature(m_poly, lc_dic);
        }));
    var landClassImage = ee.Image().byte().paint(land_features, property).rename(property);
    var stratified = landClassImage.addBands(ee.Image.pixelLonLat())
        .stratifiedSample({
            seed: seed,
            numPoints: nP,
            classBand: property,
            scale: 1,
            region: land_features.geometry()
        }).map(function (f) {
            return f.setGeometry(ee.Geometry.Point([f.get('longitude'), f.get('latitude')]));
        });
    return stratified;
}

function createTrainingData2(theComposite, trainingPoints, property) {
    var training = null;
    try {
        training = theComposite.sampleRegions({
            collection: trainingPoints,
            properties: [property],
            scale: 1
        });
    }
    catch (error) {
        throw ('Make sure you have selected a valid set of images.  Choose an image collection and set the start date');
    }
    return training;
}

/*
 * Wrapper function for classifier training. 
 */
function trainClassifier(training, nT, property, bandOrder) {
    return ee.Classifier.smileRandomForest(nT).train({
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

function validateClassification(validationPoints, theComposite, randomForest) {
    var validationPointsData = createTrainingData2(theComposite, validationPoints, property)
    var validated = validationPointsData.classify(randomForest);
    testAccuracy = validated.errorMatrix(property, 'classification');
    print('Validation error matrix: ', testAccuracy);
    print('Validation overall accuracy: ', testAccuracy.accuracy());
    print("Consumer's accuracy", testAccuracy.consumersAccuracy());
    print("Producer's accuracy", testAccuracy.producersAccuracy());
    print("Kappa", testAccuracy.kappa());
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

/*
 * Draw the AOI
 */
function drawAOI(theAOIMap, theAOI) {
    var myAOIMap = theAOIMap;
    try {
        Map.remove(myAOIMap);
    }
    catch (error) {
    }
    myAOIMap = drawObject(theAOI, aoiBorderColour, 'Area of Interest');
    return myAOIMap;
}

/*
 * Draw the classification.  You might wish to call this when you have changed
 * the colour palette but do not wish to reclassify
 */
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
        theClassifiedMap = Map.addLayer(classifiedPixels, { palette: thePalette, min: 1, max: thePalette.length }, 'The classification');
    }
    catch (error) {
        print('There is nothing to draw yet!');
    }
    return theClassifiedMap;
}

/*
 * Retreive legend data and add to panel
*/
function getLegend(legend) {
    try {
        Map.remove(legend);
    }
    catch (error) {
        // message
    }
    // set position of panel
    legend = ui.Panel({
        style: {
            position: 'bottom-right',
            padding: '8px 15px'
        }
    });
    // Create legend title
    var legendTitle = ui.Label({
        value: 'Land Cover',
        style: {
            fontWeight: 'bold',
            fontSize: '18px',
            margin: '0 0 4px 0',
            padding: '0'
        }
    });
    // Add the title to the panel
    legend.add(legendTitle);
    // Creates and styles 1 row of the legend.
    var makeRow = function (color, name) {
        // Create the label that is actually the colored box.
        var colorBox = ui.Label({
            style: {
                backgroundColor: color,
                // Use padding to give the box height and width.
                padding: '8px',
                margin: '0 0 4px 0'
            }
        });
        // Create the label filled with the description text.
        var description = ui.Label({
            value: name,
            style: { margin: '0 0 4px 6px' }
        });
        // return the panel
        return ui.Panel({
            widgets: [colorBox, description],
            layout: ui.Panel.Layout.Flow('horizontal')
        });
    };
    var palette = getPalette(Map.drawingTools().layers(), property);
    var names = getNames(Map.drawingTools().layers(), property);
    for (var ii = 0; ii < ee.List(palette).length().getInfo(); ++ii) {
        legend.add(makeRow(palette[ii], names[ii]));
    }
    return legend;
}

// ### >>> GUI elements <<< ###

// Side panel
var classificationPanel = ui.Panel({
    layout: ui.Panel.Layout.flow('vertical'),
    style: {
        width: '320px',
        backgroundColor: colors.gray,
        position: 'bottom-left'
    }
});
// Add it to map
ui.root.insert(0, classificationPanel);

// YMYW banner
var banner = ui.Panel({
    layout: ui.Panel.Layout.flow('vertical'),
    style: {
        width: '280px',
        backgroundColor: colors.transparent,
        position: 'bottom-left'
        //shown: false
    }
});
Map.add(banner);
// Title and description.
var intro = ui.Label(theTitle,
    {
        fontWeight: 'bold',
        color: colors.title,
        fontSize: '18px',
        margin: '0px 0px',
        backgroundColor: colors.transparent
    }
);
banner.add(intro);

// Selection menus and sliders parameters 
var labelStyle = { fontSize: '12px', color: colors.blue, fontWeight: 'bold' };
// Define the select button for the AOI
var selectImageCollectionLabel = ui.Label({
    value: 'Select image collection',
    style: labelStyle
});
var selectImageCollection = ui.Select({
    items: [L8SR, L8TOA, S2SR, S2TOA],
    placeholder: satelliteImageCollection,
});
classificationPanel.add(selectImageCollectionLabel).add(selectImageCollection);

// Date selection
var selectStartDateLabel = ui.Label({
    value: 'Select start of classification year',
    style: labelStyle
});
var dateSliderStartDate = ui.DateSlider({
    start: calStartDate,
    end: ee.Date(Date.now()),
    value: baseDate,
    period: 1,
    onChange: getStartDateCallback
});
classificationPanel.add(selectStartDateLabel).add(dateSliderStartDate);

// Composite label
var defineCompositesLabel = ui.Label({
    value: 'Define composites',
    style: labelStyle
});
var textBoxDefineComposites = ui.Textbox({
    onChange: function (value) {
        textBoxDefineComposites.setValue(value);
    }
});
textBoxDefineComposites.setValue(intervals);
classificationPanel.add(defineCompositesLabel).add(textBoxDefineComposites);

// Cloud tolerance
var selectCloudLabel = ui.Label({
    value: '% Cloud tolerance',
    style: labelStyle
});
var sliderCloud = ui.Slider({
    min: 0, max: 100, value: cloud, step: 10,
    style: { stretch: 'horizontal', width: '300px' }
});
sliderCloud.onChange(changeCloudCallback);
classificationPanel.add(selectCloudLabel).add(sliderCloud);

// Random Forest N trees
var selectRFTreeLabel = ui.Label({
    value: 'RF: Number of trees',
    style: labelStyle
});
var sliderTrees = ui.Slider({
    min: 10, max: 500, value: nTrees, step: 10,
    style: { stretch: 'horizontal', width: '300px' }
});
sliderTrees.onChange(changeTreesCallback);
classificationPanel.add(selectRFTreeLabel).add(sliderTrees);

// Training points N
var selectTrainLabel = ui.Label({
    value: 'RF: Number of training points/class',
    style: labelStyle
});
var sliderTrain = ui.Slider({
    min: 100, max: 10000, value: nTrainPoints, step: 100,
    style: { stretch: 'horizontal', width: '300px' }
});
sliderTrain.onChange(changeTrainCallback);
classificationPanel.add(selectTrainLabel).add(sliderTrain);

// Cross-Validation
var selectPropCrossValiLabel = ui.Label({
    value: 'Cross-validation (%)',
    style: labelStyle
});
var sliderPropCrossVali = ui.Slider({
    min: 10, max: 50, value: PropCrossVali, step: 5,
    style: { stretch: 'horizontal', width: '300px' }
});
sliderPropCrossVali.onChange(changePropCrossValiCallback);
classificationPanel.add(selectPropCrossValiLabel).add(sliderPropCrossVali);


// ### >>> GUI Buttons <<< ###

// view composites layers
var showCompositeButton = ui.Button({ label: 'Show composites' });
showCompositeButton.onClick(showCompositeCallback);
classificationPanel.add(showCompositeButton);

// classify
var classifyButton = ui.Button({ label: 'Classify' });
classifyButton.onClick(classifySceneCallback);
classificationPanel.add(classifyButton);

// Add recentre to panel
var recentreButton = ui.Button('Recentre');
recentreButton.onClick(reCentre);
classificationPanel.add(recentreButton);

// Add redraw button to panel
var redrawButton = ui.Button('Redraw');
redrawButton.onClick(reDrawClassifiedCallback);

// Add variable importance button to panel
var variableImportanceButton = ui.Button('Variable importance (RF)');
variableImportanceButton.onClick(variableImportanceCallback);

// Add variable importance button to panel
var oobButton = ui.Button('Out of bag error (RF)');
oobButton.onClick(oobCallback);

// Add validation button to panel
var validationButton = ui.Button('Validate classification');
validationButton.onClick(validateCallback);

// Add export button to panel
var exportButton = ui.Button('Export classification and more');
exportButton.onClick(exportCallback);

// ### >>> GUI callback functions <<< ###

/*
 * Get training and validation points
 */
function changeTrainCallback() {
    var sliderVal = sliderTrain.getValue();
    nTrainPoints = sliderVal;
    nValidPoints = ee.Number(ee.Number(nTrainPoints).multiply(ee.Number(PropCrossVali)).divide(ee.Number(100).subtract(ee.Number(PropCrossVali))).round().toInt());
}

/*
 * Get cloud tolearance
 */
function changeCloudCallback() {
    var sliderVal = sliderCloud.getValue();
    cloud = sliderVal;
}

/*
 * Get RF tree number
 */
function changeTreesCallback() {
    var sliderVal = sliderTrees.getValue();
    nTrees = sliderVal;
}

/*
 * Get validation points
 */
function changePropCrossValiCallback() {
    var sliderVal = sliderPropCrossVali.getValue();
    PropCrossVali = sliderVal;
    nValidPoints = ee.Number(ee.Number(nTrainPoints).multiply(ee.Number(sliderVal)).divide(ee.Number(100).subtract(ee.Number(sliderVal))).round().toInt());
}

/*
 * Get start date
 */
function getStartDateCallback(date) {
    baseDate = date.start();
}

/*
 Show composite
 */
function showCompositeCallback() {
    print("Show scene...");
    showcomposite();
}

/*
 * Export outputs
 */
function exportCallback() {
    //Export the classified image for the Area Of Interest
    Export.image.toDrive({
        image: classifiedPixels,
        description: 'classified_aoi'.toString(),
        region: aoi.bounds(),
        maxPixels: 1e13,
        crs: epsg,
        scale: resolution
    });
    // Export the composite images for the Area of Interest
    Export.image.toDrive({
        image: seasonalComposite,
        description: 'composite_aoi'.toString(),
        region: aoi.bounds(),
        maxPixels: 1e13,
        crs: epsg,
        scale: resolution
    });
    var fMap = function (f) {
        return ee.Feature(f.getEeObject());
    };
    // Export the drawn objects to a file.
    Export.table.toDrive({
        collection: ee.FeatureCollection(Map.drawingTools().layers().map(fMap)),
        description: 'layers',
        fileFormat: 'KML'
    });
    // Export the points for training
    Export.table.toDrive({
        collection: trainingPoints,
        description: 'trainingPoints',
        fileFormat: 'KML'
    });
    // Export the points for validation
    if (validationPoints !== null) {
        Export.table.toDrive({
            collection: validationPoints,
            description: 'validationPoints',
            fileFormat: 'KML'
        });
    }
    // Export the error matrix from validation
    if (testAccuracy !== null) {
        var exportAccuracy = ee.Feature(null, { matrix: testAccuracy.array() })
        Export.table.toDrive({
            collection: ee.FeatureCollection(exportAccuracy),
            description: 'ErrorMatrix',
            fileFormat: 'CSV'
        });
    }
}

/*
 * Classify AOI - run RF classifier
 */
function classifySceneCallback() {
    print("Classifying scene...");
    main();
    // redraw AOI on top of classification
    var layers = Map.drawingTools().layers();
    aoiMap = drawAOI(aoiMap, getAOI(layers));
    try {
        classificationPanel.add(redrawButton);
        classificationPanel.add(oobButton);
        classificationPanel.add(variableImportanceButton);
        classificationPanel.add(validationButton);
        classificationPanel.add(exportButton);
    }
    catch (error) {
        print(error.message);
    }
}

/*
 * Cross validate classification
 */
function validateCallback() {
    print("validate classification...");
    // generate stratified validation points
    print(ee.String('Cross-Validate with ').cat(ee.Number(PropCrossVali)).cat(ee.String('% of the training chips and ').cat(ee.Number(nValidPoints).toInt()).cat(ee.String(' points per class'))));
    var layers = Map.drawingTools().layers();
    var prop_sub_expression = ee.String('> ').cat(ee.Number(1).subtract(ee.Number(PropCrossVali).divide(ee.Number(100))));
    validationPoints = createDataPoints(layers, nValidPoints, validationSeed, property, prop_sub_expression, crossValSeed);
    validateClassification(validationPoints, seasonalComposite, randomForest);
}

/*
 * Redraw the classified map but do not reclassify
 */
function reDrawClassifiedCallback() {
    var layers = Map.drawingTools().layers();
    aoiMap = drawAOI(aoiMap, getAOI(layers));
    classifiedMap = drawClassifiedMap(classifiedPixels, classifiedMap, getPalette(layers, property));
    try {
        Map.add(legend = getLegend(legend));
    }
    catch (error) {
        print('error', error);
    }
}

/*
 * Determine variable importance and print to console
 */
function variableImportanceCallback() {
    var vi = null;
    try {
        vi = ee.Dictionary(randomForest.explain()).get('importance');
    }
    catch (error) {
        print('Classification has not yet been run');
        return null;
    }
    var vimp = ee.Feature(null, vi);
    var chart =
        ui.Chart.feature.byProperty(vimp)
            .setChartType('ColumnChart')
            .setOptions({
                title: 'Random Forest Variable Importance',
                legend: { position: 'none' },
                hAxis: { title: 'Bands' },
                vAxis: { title: 'Importance' }
            });
    print(chart);
    print('Variable Importance:', vi);
    return vi;
}

/*
 * Display out of bag (oob) statistic
 */
function oobCallback() {
    var oob = null;
    try {
        oob = ee.Dictionary(randomForest.explain()).get('outOfBagErrorEstimate');
    }
    catch (error) {
        print('Classification has not yet been run');
        return null;
    }
    print('Out of bag error estimate = ', oob);
    return oob;
}
