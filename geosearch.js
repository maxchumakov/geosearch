///Geosearch v. 0.1 (c)Maxim Chumakov, 2015
ymaps.ready(GeoSearch);
lostTime.value=isoDate(new Date());
function GeoSearch(){
	GeoSearch.the=this; this.timerActivated=true;
	this.ontimechange=function(lostString,intervalString){timingRecalculation.defer(3000,{lostTime:Date.parse(lostString),searchInterval: intervalString });};
	var timingRecalculation=new DeferredAction(function(data){
        lostTime=data.lostTime; dhours=(( new Date() ).getSeconds()-lostTime.getSeconds())/3600;
        cycleNumber=speed*dhours/gridStep; time=cycleNumber;
        recalculateSearchArea( null );
	});
	var lostTime=new Date(),dhours=0;
	var speed=5000,gridStep=100,cycleNumber=speed*dhours/gridStep,demoAccel=7.2,bkgrRecalcTime=3600000*gridStep/speed  /demoAccel  ;//m/h,m,,ms
	function indicateTime(cycleNumber){return isoDate(new Date(lostTime.valueOf()+cycleNumber*gridStep/speed*3600000));}
	ymaps.option.presetStorage.add('sm#dot', {iconLayout : ymaps.templateLayoutFactory.createClass
			('<svg id="icon" style="position: absolute; z-index:2000; left:-3.125px; top:-3.125px; width:6.25px; height:6.25px"><g style="stroke-width:0; fill-opacity:$[options.opacity]" transform="scale(0.0625)"><circle cx="50" cy="50" r="36" fill="$[options.color]"/></g></svg>',{getShape:function(){return new ymaps.shape.Circle(new ymaps.geometry.pixel.Circle([0,-18.5],12.5));}}),iconColor:'#ed1c24'});
	var begLatitude=55.76,begLongitude=37.64,searchPoints= [[0]] ,timer,time= cycleNumber ,lastTime=0,n=0;
    var map=new ymaps.Map("map",{center:[begLatitude,begLongitude],zoom: 10 });
    var bounds=[],boundButton=new ymaps.control.Button({data:{content:"Пр",title:"Преграда"}}); map.controls.add(boundButton, {float: 'right'});
	var searchers=[],searcherButton=new ymaps.control.Button({data:{content:"По",title:"Поисковик"}}); map.controls.add(searcherButton, {float: 'right'});
	var deferredRecalculation=new DeferredAction(recalculateSearchArea);
	boundButton.events.add('press',function(e){searcherButton.state.set('selected',false);});
	searcherButton.events.add('press',function(e){boundButton.state.set('selected',false);});
    map.events.add('click', function (e) {
        if(boundButton.state.get('selected')){
            var coords = e.get('coords');
			var bound = new ymaps.Polyline([
				[Number(coords[0]),Number(coords[1])],[Number(coords[0]),Number(coords[1])]
			], {}, {strokeColor: "#88000088", strokeWidth: 4, editorMaxPoints: 16,
				editorMenuManager: function(items){
					items.push({	title: "Удалить линию",
									onClick: function(){map.geoObjects.remove( bound ); bounds.splice(bounds.indexOf( bound ),1);}	}); 
					return items;
				}
			});
			bound.events.add(['geometrychange'],function(e){ deferredRecalculation.defer(5000, null ); });
			bounds.push(bound); map.geoObjects.add(bound); bound.editor.startEditing();
        }else if(searcherButton.state.get('selected')){//TODO radio button
            coords = e.get('coords'); var deferredWalk=new DeferredAction(walk);
			var searcher=new ymaps.GeoObject({
				geometry: { type: "Point", coordinates: [Number(coords[0]),Number(coords[1])] },
				properties: { iconContent: '*', hintContent: 'Положение поисковика '+searchers.length}//TODO задавать имя
			}, { preset: 'islands#redStretchyIcon', draggable: true }); searchers.push(searcher); map.geoObjects.add(searcher);
			var path = new ymaps.Polyline([
				[Number(coords[0]),Number(coords[1])],[Number(coords[0]),Number(coords[1])]
			], {}, {strokeColor: "0066FFFF", strokeWidth: getPixelWidth( 10 ) ,strokeOpacity:0.3, editorMaxPoints: 160 ,
				editorMenuManager: function(items){
					items.push({	title: "Удалить поисковика",
									onClick: function(){map.geoObjects.remove(path); map.geoObjects.remove(searcher); searchers.splice(searchers.indexOf( searcher ),1);}	}); 
					return items;
				}
			}); map.geoObjects.add(path); path.editor.startEditing();
			searcher.events.add(['geometrychange'],function(e){
				deferredWalk.defer(2000, {path:path,coords:searcher.geometry.getCoordinates()} );
			});
			searcher.GeoSearch_Tags={}; searcher.GeoSearch_Tags.path=path;////
		}
    });
	function walk(data){var p=data.path.geometry.getCoordinates(); p.push(data.coords); data.path.geometry.setCoordinates(p);}
	map.events.add('boundschange',function(e){
		if(e.get('newZoom')!=e.get('oldZoom'))
			for(var searcher in searchers)searchers[searcher].GeoSearch_Tags.path.options.set('strokeWidth',getPixelWidth( 10 ));//обзор в метрах
			//map.container.fitToViewport();////
	});
	var searchBeginPlacemark = new ymaps.GeoObject({
        geometry: { type: "Point", coordinates: [begLatitude,begLongitude] },
        properties: { iconContent: '!', hintContent: 'Перетащите в место пропажи' }
    }, { preset: 'islands#redStretchyIcon', draggable: true });
    searchBeginPlacemark.events.add(['geometrychange'], function(e){
		deferredRecalculation.defer(5000, searchBeginPlacemark.geometry.getCoordinates() );//e.get('coords');
	});
    map.geoObjects.add(searchBeginPlacemark);
	var placeManager=new ymaps.ObjectManager({clusterize: false ,gridSize:32}),placeManagerCurrentId = 0;
    placeManager.objects.options.set('preset','sm#dot');
    //placeManager.clusters.options.set('preset', 'islands#blueClusterIcons');
    map.geoObjects.add(placeManager);
recalculateSearchArea(null);
	timer=window.setInterval(function(){if(GeoSearch.the.timerActivated){inflateSearchArea(); time++;/*if(time++> 5 )window.clearTimeout(timer);*/ showLastSearchPoints();}}, bkgrRecalcTime);
	
	function recalculateSearchArea(coords)
	{	if(coords!==null){begLatitude=Number(coords[0]).toFixed(3); begLongitude=Number(coords[1]).toFixed(3);}//parseInt(i,10)
		placeManager.removeAll(); searchPoints=[[0]]; lastTime=0; n=0;
		for(var k=0;k<time;k++){inflateSearchArea();}
		showLastSearchPoints();
	}
	function showLastSearchPoints()
	{	for(var i in searchPoints)if(searchPoints.hasOwnProperty(i))
		{   i=parseInt(i,10); for(var j in searchPoints[i])if(searchPoints[i].hasOwnProperty(j))
			{   j=parseInt(j,10);
				var coords=indiciesToCoords(i,j),text=(n++)+")"+i+","+j+"="+searchPoints[i][j],timetext=indicateTime(searchPoints[i][j]/10);//
				if(lastTime*10<=searchPoints[i][j]&&searchPoints[i][j]<time*10)
					placeManager.add({type:'Feature',id:placeManagerCurrentId++,
										geometry:{type:'Point',coordinates:coords} ,properties:{hintContent:timetext,balloonContent:timetext} });
			}
		}lastTime=time;
	}
	function inflateSearchArea()
	{   for(var i in searchPoints)if(searchPoints.hasOwnProperty(i))
		{   i=parseInt(i,10); for(var j in searchPoints[i])if(searchPoints[i].hasOwnProperty(j))
			{   j=parseInt(j,10); var old=indiciesToCoords(i,j);
				setPlace(i,j-1,i,j,old); setPlace(i,j+1,i,j,old);
				if(!searchPoints.hasOwnProperty(i-1))searchPoints[i-1]=[]; setPlace(i-1,j,i,j,old);
				if(!searchPoints.hasOwnProperty(i+1))searchPoints[i+1]=[]; setPlace(i+1,j,i,j,old);
			}
		}
	}
	function setPlace(I,J,i,j,old)
	{	var nov=indiciesToCoords(I,J);
		if(!searchPoints[I].hasOwnProperty(J)&&!intersectBounds(old,nov))
		{	searchPoints[I][J]=searchPoints[i][j]+10; minPath(I,J,I-1,J-1);  minPath(I,J,I,J-1);
            minPath(I,J,I+1,J-1); minPath(I,J,I-1,J  ); minPath(I,J,I+1,J  );
			minPath(I,J,I-1,J+1);  minPath(I,J,I,J+1);  minPath(I,J,I+1,J+1);
		}
	}
	function minPath(I,J,i,j)//TODO check bounds intersection!!!
	{	if(searchPoints.hasOwnProperty(i)&&searchPoints[i].hasOwnProperty(j))
			searchPoints[I][J]=Math.min(searchPoints[I][J],searchPoints[i][j]+ (I==i||J==j?10:14) );}
	function intersectBounds(old,nov)
	{	for(var b in bounds)
		{	if(bounds[b].geometry!==undefined)
			for(var i=1;i<bounds[b].geometry.getLength();i++)
				if(segmentsIntersection(old,nov,bounds[b].geometry.getCoordinates()[i-1],bounds[b].geometry.getCoordinates()[i]))return true;
		}return false;
	}
	function indiciesToCoords(i,j)
	{	return ymaps.coordSystem.geo.solveDirectProblem
				(ymaps.coordSystem.geo.solveDirectProblem([begLatitude,begLongitude],[1,0],-i*gridStep).endPoint,[0,1],j*gridStep).endPoint;
	}
	function getPixelWidth(meterWidth)
	{	var projection=map.options.get('projection'),zoom=map.getZoom(); //projection.getCoordSystem()
		var width=projection.toGlobalPixels([begLatitude,begLongitude],zoom)[1]-
				projection.toGlobalPixels(ymaps.coordSystem.geo.solveDirectProblem([begLatitude,begLongitude],[1,0],meterWidth).endPoint,zoom)[1];
		return width<1?1:width;
	}
	function segmentsIntersection(a1,a2,b1,b2)
	{   var v1=(b2[0]-b1[0])*(a1[1]-b1[1])-(b2[1]-b1[1])*(a1[0]-b1[0]);//(bx2-bx1)*(ay1-by1)-(by2-by1)*(ax1-bx1);
		var v2=(b2[0]-b1[0])*(a2[1]-b1[1])-(b2[1]-b1[1])*(a2[0]-b1[0]);//(bx2-bx1)*(ay2-by1)-(by2-by1)*(ax2-bx1);
		var v3=(a2[0]-a1[0])*(b1[1]-a1[1])-(a2[1]-a1[1])*(b1[0]-a1[0]);//(ax2-ax1)*(by1-ay1)-(ay2-ay1)*(bx1-ax1);
		var v4=(a2[0]-a1[0])*(b2[1]-a1[1])-(a2[1]-a1[1])*(b2[0]-a1[0]);//(ax2-ax1)*(by2-ay1)-(ay2-ay1)*(bx2-ax1);
		return (v1*v2<0) && (v3*v4<0);
	}
}
function DeferredAction(act)
{	var timer=null,action=act,lastEventData=null;
	this.defer=function(delay,data)
	{	if(timer!==null){window.clearTimeout(timer); timer=null;}
		lastEventData=data; timer=window.setTimeout(ontimer,delay);
	}
	function ontimer(){timer=null; action(lastEventData);}
}
function isoDate(date){return date.getFullYear()+"-"+leadZero(parseInt(date.getMonth(),10)+1)+"-"+leadZero(date.getDate())+"T"+leadZero(date.getHours())+":"+leadZero(date.getMinutes());}
function leadZero(value){return value<10?'0'+value:value;}
/** https://github.com/csnover/js-iso8601 */(function(n,f){var u=n.parse,c=[1,4,5,6,7,10,11];n.parse=function(t){var i,o,a=0;if(o=/^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(t)){for(var v=0,r;r=c[v];++v)o[r]=+o[r]||0;o[2]=(+o[2]||1)-1,o[3]=+o[3]||1,o[8]!=="Z"&&o[9]!==f&&(a=o[10]*60+o[11],o[9]==="+"&&(a=0-a)),i=n.UTC(o[1],o[2],o[3],o[4],o[5]+a,o[6],o[7])}else i=u?u(t):NaN;return i}})(Date)
