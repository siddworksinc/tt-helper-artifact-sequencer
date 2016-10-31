$scope = this;
$rootScope = this;

  var log = function(s) {
    console.log("[relicCalculator] " + s);
  };

function init() {
    $rootScope.world = 1;
    $scope.artifacts = {1: [], 2: []};
    $scope.artifactCaps = {};

    for (var ak in artifactInfo) {
      var a = artifactInfo[ak];
      $scope.artifacts[a.world].push({
        name: a.name,
        id: a.id,
        level: 0
      });
      $scope.artifactCaps[a.id] = a.levelcap;
    }

    $scope.heroes = [];
    heroInfo.forEach(function(h, i) {
      $scope.heroes.push({
        name: h.name,
        id: h.id,
        weapons: 0,
        level: {
          1: 0,
          2: 0
        },
      });
    });

    $scope.ownedCustomizations = [];
    $scope.customizations = [];
    cBonus.forEach(function(c, i) {
      $scope.customizations.push({
        name: cNames[i],
        index: i,
        value: 0,
        step: (i == 4 ? 0.5 : 1), // ehhhhhhhhh
        max: customizationMax[i]
      });
    });

    $scope.methods = [
      {name: "All Damage",        index: 0, value: false, tabname: "ADmg"},
      {name: "Gold",              index: 1, value: false, tabname: "Gold"},
      {name: "Tap Damage",        index: 2, value: false, tabname: "TDmg"},
      {name: "Dmg Equivalent",    index: 3, value: false, tabname: "DmgE"}];

    $scope.relics = {1: 0, 2: 0};
    $scope.nsteps = 0;
    $scope.greedy = 1;
    $scope.active = false;
    $scope.critss = 0;
    $scope.zerker = 0;

    $scope.maxStageSPM = 0;
    $scope.memory = 0;

    $scope.w_chiprob = 0;
    $scope.w_totalwp = 0;
    $scope.w_tonexts = 0;
    $scope.w_getting = 0;
    $scope.w_probset = 0;

    $scope.r_cstage = {1: 0, 2: 0};
    $scope.r_undead = {1: 0, 2: 0};
    $scope.r_levels = {1: 0, 2: 0};
    $scope.r_hbonus = 0;
    $scope.r_sbonus = 0;
    $scope.r_reward = 0;
    $scope.r_nextbp = 0;
    $scope.r_atnext = 0;

    $scope.all_damage = 0;
    $scope.dps_damage = 0;
    $scope.tap_damage = 0;
    $scope.twc_damage = 0;

    $scope.useRelics = true;
    $scope.useAllRelics = false;
    $scope.buyArtifact = true;
    $scope.newArtifactUseSeed = true;
	$scope.artifactCurrentSeed = {1: 0, 2: 0};
	$scope.artifactSteps = [];
}

  var transformScopeArray = function(scopeArray) {
    var newArray = newZeroes(scopeArray.length);
    for (var x in scopeArray) {
      var thing = scopeArray[x];
      newArray[thing.index] = parseFloat(thing.value);
    }
    return newArray;
  };

  $scope.filterArtifacts = function (a) {
    return a.world == $rootScope.world;
  };

  var getArtifacts = function() {
    return $scope.artifacts[$rootScope.world].map(function(a) {
      return [a.id, parseInt(a.level)];
    });
  };

  var getWeapons = function() {
    return transformScopeArray($scope.heroes.map(function (h) {
      return {index: h.id - 1, value: h.weapons}; }));
  };

  var getLevels = function() {
    return transformScopeArray($scope.heroes.map(function (h) {
      return {index: h.id - 1, value: h.level[$rootScope.world]}; }));
  };

  var getCustomizations = function() {
    return transformScopeArray($scope.customizations);
  }

  $scope.updateRelicInfo = function() {
    var uaPercent = ($rootScope.world == 1 ? 0.05 : 0.02);
    var uaMultiplier = 1 + uaPercent * $scope.r_undead[$rootScope.world];

    var heroRelics = $scope.r_levels[$rootScope.world] / 1000;
    var stageRelics = Math.pow(Math.floor($scope.r_cstage[$rootScope.world]/15) - 5, 1.7);

    heroRelics = Math.round(heroRelics * uaMultiplier);

    stageRelics = Math.ceil(stageRelics * uaMultiplier);
    stageRelics = isNaN(stageRelics) ? 0 : stageRelics;

    $scope.r_hbonus = heroRelics;
    $scope.r_sbonus = stageRelics;

    $scope.r_nextbp = (Math.floor($scope.r_cstage[$rootScope.world] / 15) + 1) * 15;
    $scope.r_reward = Math.round(2 * (stageRelics + heroRelics));

    stageRelics = Math.pow(Math.floor($scope.r_nextbp/15) - 5, 1.7);
    stageRelics = Math.ceil(stageRelics * uaMultiplier);
    stageRelics = isNaN(stageRelics) ? 0 : stageRelics;
    $scope.r_atnext = Math.round(2 * (stageRelics + heroRelics));
  };

  $scope.updateStatsInfo = function() {
    log("updateStatsInfo");
    var weapons = getWeapons();
    $scope.w_totalwp = weapons.reduce(function(a, b) { return a + b; });
    var g = getGameState();
    var tap = g.getTapDamage();

    $scope.all_damage = g.getAllDamage();
    $scope.dps_damage = parseFloat(g.getTotalHeroDPS().toPrecision(4)).toExponential();
    $scope.tap_damage = parseFloat(tap[0].toPrecision(4)).toExponential();
    $scope.twc_damage = parseFloat(tap[1].toPrecision(4)).toExponential();
    $scope.twa_damage = parseFloat(tap[2].toPrecision(4)).toExponential();
  };

  $scope.updateThings = function(updateCookies) {
    log("update things");

    // recalculate things
    $scope.updateRelicInfo();
    $scope.updateStatsInfo();
  };

  $scope.stateChanged = function() {
    log("state changed");

    $scope.updateThings();
  };

  var getGameState = function() {
    log("getGameState");

    return new GameState({
      world: $rootScope.world,
      artifacts: getArtifacts(),
      levels: getLevels(),
      weapons: getWeapons(),
      customizations: getCustomizations(),
      skillLevelCrit: $scope.critss,
      skillLevelTDMG: $scope.zerker,
      memory: $scope.memory
    });
  };

  // validation of values
  $scope.artifactCheck = function(a) {
    var ai = a.id;
    if ($scope.artifactCaps[ai] != null && a.level > $scope.artifactCaps[ai]) {
      a.level = $scope.artifactCaps[ai];
    }
    if (a.level == null) {
      a.level = 0;
    }
    // if (ai == artifactInfo.UA.id) {
    //   $scope.r_undead[$rootScope.world] = a.level;
    // }
    $scope.stateChanged();
  };

  $scope.weaponsCheck = function(i, ai) {
    if ($scope.heroes[i].weapons == null) {
      $scope.heroes[i].weapons = 0;
    }
    $scope.stateChanged();
  };

  $scope.levelsCheck = function(i, ai) {
    if ($scope.heroes[i].level == null) {
      $scope.heroes[i].level = 0;
    }
    console.log("levelsCheck");
    $scope.r_levels[$rootScope.world] = getLevels().reduce(function(a, b) { return a + b; });
    console.log($scope.r_levels);
    $scope.stateChanged();
  };

  $scope.customizationCheck = function(i, ai) {
    if ($scope.customizations[i].value == null) {
      $scope.customizations[i].value = 0;
    }
    $scope.stateChanged();
  };

  var sortByArtifactOrder = function(s) {
    var indexToSStep = {};
    for (var ss in s) {
      indexToSStep[s[ss].id] = s[ss];
    }
    var newSS = [];
    var aOrder = $scope.artifacts[$rootScope.world].map(function(a) { return a.id; });
    // console.log(aOrder);
    for (var i in aOrder) {
      if (aOrder[i] in indexToSStep) {
        newSS.push(indexToSStep[aOrder[i]]);
      }
    }
    return newSS;
  };

  var getOwned = function() {
      return $scope.artifacts[$rootScope.world].filter(function(a) {
        return a.owned;
      }).length;
    };

  $scope.calculate = function() {
    if ($scope.relics[$rootScope.world] == 0 && $scope.nsteps == 0) {
      $scope.stepmessage = "Get some relics or enter a number of steps!";
      $scope.steps = [];
      $scope.summary_steps = [];
      return;
    }

    if (getLevels().reduce(function(a, b) { return a + b; }, 0) == 0) {
      $scope.stepmessage = "Don't forget to fill in your hero levels - for an explanation of why they're needed check out the FAQ page.";
      $scope.steps = [];
      $scope.summary_steps = [];
      return;
    }

    var methods = [];
    for (var m in $scope.methods) {
      if ($scope.methods[m].value) {
        methods.push($scope.methods[m].index);
      }
    }

    var response;
    response = getSteps({
      world: $rootScope.world,
      artifacts: getArtifacts(),
      levels: getLevels(),
      weapons: getWeapons(),
      customizations: getCustomizations(),
      skillLevelCrit: $scope.critss,
      skillLevelTDMG: $scope.zerker,
      memory: $scope.memory,
      relics: $scope.relics[$rootScope.world],
      steps: $scope.nsteps,
      useActives: $scope.active,
      methods: methods,
    });

    $scope.steps = [];
    $scope.summary_steps = [];
    for (var m in response) {
      console.log(response[m]["summary"]);

      $scope.steps[m] = response[m]["steps"];
      $scope.summary_steps[m] = sortByArtifactOrder(response[m]["summary"]);
    }
  };

  $scope.step = function(summary, method, stepindex) {
    var step = summary ? $scope.summary_steps[method][stepindex] : $scope.steps[method][stepindex];

    var cost = step.cost;
    // if this is a summary step, iterate through steps and delete all those with same id
    if (summary) {
      $scope.summary_steps[method].splice(stepindex, 1);
      var toDelete = [];
      for (var s in $scope.steps[method]) {
        if ($scope.steps[method][s].id == step.id) {
          toDelete.push(s);
        }
      }
      toDelete.reverse();
      for (var i in toDelete) {
        $scope.steps[method].splice(toDelete[i], 1);
      }
    } else {
      $scope.steps[method].splice(stepindex, 1);
      // delete from ss if it's the last step
      for (var ss in $scope.summary_steps[method]) {
        var sstep = $scope.summary_steps[method][ss];
        if (sstep.id == step.id && sstep.level == step.level) {
          $scope.summary_steps[method].splice(ss, 1);
          break;
        }
      }

      // delete from s
      var toDelete = [];
      for (var s in $scope.steps[method]) {
        if (s >= stepindex) {
          break;
        }
        if ($scope.steps[method][s].id == step.id) {
          toDelete.push(s);
          cost += $scope.steps[method][s].cost;
        }
      }
      toDelete.reverse();
      for (var i in toDelete) {
        $scope.steps[method].splice(toDelete[i], 1);
      }
    }

    var total = 0;
    for (var s in $scope.steps[method]) {
      total += $scope.steps[method][s].cost;
      $scope.steps[method][s].cumulative = total;
    }

    // if step, go through summary and delete from cost
    // if summary step is here, hasn't been deleted
    if (!summary) {
      for (var ss in $scope.summary_steps[method]) {
        var sstep = $scope.summary_steps[method][ss];
        if (sstep.id == step.id) {
          $scope.summary_steps[method][ss].value -= cost;
        }
      }
    }

    // actually apply the step
    for (var a in $scope.artifacts[$rootScope.world]) {
      var artifact = $scope.artifacts[$rootScope.world][a];
      if (artifact.id == step.id) {
        artifact.level = step.level;
        $scope.relics[$rootScope.world] -= cost;
        break;
      }
    }
    $scope.relics[$rootScope.world] = Math.max($scope.relics[$rootScope.world], 0);
    // $scope.$parent.updateSS(6, $scope.relics);
    // TODO: impact on other methods (grey out?)

    $scope.stateChanged();
  };

  // TODO: this is a copy
  var cMapping = {
    "0": 2, // gold dropped
    "1": 1, // crit damage
    "2": 4, // crit chance
    "3": 0, // all damage
    "4": 5, // tap damage
    "5": 3  // chest gold
  };

  // TODO: fix this
  var parseCustomizations = function(s) {
    var c = [0, 0, 0, 0, 0, 0];
    s.split("/").forEach(function(p, i, array) {
      c[cMapping[p[0]]] += customizationMapping[p].value;
    });
    return c.map(function(f) { return parseFloat(f.toPrecision(3)); });
  };

 $scope.loadFromFile = function() {

    // var levels2 = j.heroSave.heroLevelsGirl;
    // for (var l in levels2) {
    //   $scope.heroes[l-1].level[2] = Math.max(parseInt(levels2[l]), $scope.heroes[l-1].level[2]);
    // }

    $scope.stateChanged();
  };


function calculateArtifacts() {
	init();

	var custs = getQueryParam("c");
	if(custs == "Not found") {
		custs = null;
	}
  fillCustomizations(custs)

	var artifs = getQueryParam("al");
	if(artifs == "Not found") {
		artifs = null;
	}
  fillArtifactLevels(artifs)

	var heros = getQueryParam("hl");
	if(heros == "Not found") {
		heros = null;
	}
  fillHeroLevels(heros)

	var wu = getQueryParam("wu");
	if(wu == "Not found") {
		wu = null;
	}
  fillHeroWeaponUpgrades(wu);

	var sml = getQueryParam("spl");
	if(sml == "Not found") {
		sml = 0;
	}
	$scope.memory = sml*2;

  var relics = getQueryParam("r");
  if(relics == "Not found") {
    relics = "0";
  }
  var relicsGirl = getQueryParam("rg");
  if(relicsGirl == "Not found") {
    relicsGirl = "0";
  }

  $scope.relics = {
    1: Math.round(parseFloat(relics.replace("+", ""))),
    2: Math.round(parseFloat(relicsGirl.replace("+", ""))),
  };

  var nextArtifactSeed = getQueryParam("as");
  if(nextArtifactSeed == "Not found") {
    nextArtifactSeed = 0;
  }
  var nextArtifactSeedGirl = getQueryParam("asg");
  if(nextArtifactSeedGirl == "Not found") {
    nextArtifactSeedGirl = 0;
  }
  $scope.artifactCurrentSeed = {
    1: parseInt(nextArtifactSeed),
    2: parseInt(nextArtifactSeedGirl),
  };

  $scope.stateChanged();
  $scope.steps = $scope.getList();

	for (var i in $scope.summary_steps) {
      var steps = $scope.summary_steps[i];
      for (var j in steps) {
        // console.log(steps[j]);
        // console.log(steps[j].name);
      } 
  } 

  for (var i in $scope.steps) {
      var steps = $scope.steps[i];
      for (var j in steps) {
        // console.log(steps[j]);
        // console.log(steps[j].name);
      } 
  } 

  createTable();
	  //console.log($scope.weaponSteps);
      // $scope.recolorWeapons();

      // calculateColumns();
};

	
function getQueryParam(val) {
    var result = "Not found",
        tmp = [];
    location.search
    //.replace ( "?", "" ) 
    // this is better, there might be a question mark inside
        .substr(1)
        .split("&")
        .forEach(function (item) {
        tmp = item.split("=");
        if (tmp[0] === val) result = decodeURIComponent(tmp[1]);
    });
    return result;
}

function contains(a, obj) {
    var i = a.length;
    while (i--) {
       if (a[i] === obj) {
           return true;
       }
    }
    return false;
}

function fillCustomizations(val) {
    if(val == null) {
        return
    }
	
	String.prototype.replaceAll = function(search, replacement) {
		var target = this;
		return target.split(search).join(replacement);
	};
	
    var ownedCusts = val.replaceAll(".", "/");
	var customizations = parseCustomizations(ownedCusts);
	for (var c in customizations) {
        $scope.customizations[c].value = customizations[c];
	}
}

function fillMethods(val) {
    if(val == null) {
      $scope.methods[0].value = true;
        return

    }
    $scope.methods[val].value = true;
}

function fillHeroWeaponUpgrades(val) {
    if(val == null) {
        return
    }

    var heros = val.split(".");

    $scope.heroes.forEach(function(c, i) {
        c.weapons = getLevel(c, heros);
    });
}

function fillHeroLevels(val) {
    if(val == null) {
        return
    }

    var heros = val.split(".");

    $scope.heroes.forEach(function(c, i) {
        c.level[$scope.world] = getLevel(c, heros);
    });
}

function getLevel(artifact, artifactArray) {
        var i = artifactArray.length;
        while (i--) {
           var artifact_level = artifactArray[i];
           var al = artifact_level.split("_");

           if (al[0] == artifact.id) {
               return al[1];
           }
        }
        return 0;
}

function fillArtifactLevels(val) {
    if(val == null) {
        return
    }

    var ownedArtifacts = val.split(".");

    $scope.artifacts[$rootScope.world].forEach(function(c, i) {
        c.level = getLevel(c, ownedArtifacts);
    });
	
     var ownedArtifacts = {};
	
     $scope.artifacts[$rootScope.world].forEach(function(c, i) {
	      if(c.level > 0) {
		       c.owned = true;
	      }
     });
}

function createTable() {
        //body reference
        var body = document.getElementById("stepsTable");

        for (var i in $scope.steps) {
            var steps = $scope.steps[i];
		// table row creation
		var row = document.createElement("tr");

		// put <td> at end of the table row
		var cell = document.createElement("td");
		cell.style.padding = "4px 4px 4px 4px";
		var cellText = document.createTextNode( steps.n + " " + steps.name);
		cell.appendChild(cellText);
		row.appendChild(cell);

		//row added to end of table body
		body.appendChild(row);
        } 
    }

function updateLevels() {
    $scope.totalCurrent = $scope.heroes.map(function(h) { return h.level[$rootScope.world]; }).reduce(function(a, b) { return a + b; }, 0);
};

    $scope.getList = function(slist) {
      log("get list");
      var steps = [];
      var currentSeed = $scope.artifactCurrentSeed[$rootScope.world];
      // TODO: artifact_mapping {}
      var list = $scope.artifacts[$rootScope.world].filter(function(a) {
        return !a.owned;
      });
      list.sort(function(a, b) { return a.id - b.id; });

      console.log("current seed: " + currentSeed);
      var salvages = (slist == null ? $scope.artifactSteps.map(function(s) { return s.salvage; }) : slist);
      console.log("salvages");
      console.log(salvages);


      // var salvages = [];
      // if (slist == null) {
      //   salvages = $scope.artifactSteps.map(function(s) { return s.salvage; });
      // }
      // if (!reset && isNonNull($scope.artifactSteps)) {
      //   salvages = $scope.artifactSteps.map(function(s) { return s.salvage; });
      // }
      // if (slist != null) {
      //   salvages = slist;
      // }
      var unityRandom = ($rootScope.world == 1 ? unityRandomW1 : unityRandomW2);

      console.log("owned");
      console.log(getOwned() + 1);

      var num = getOwned() + 1;
      while (list.length > 0) {
        if (list.length == 1) {
          var next = list[0].id;
          var keep = !salvages[steps.length];

          steps.push({
            n: keep ? num + "." : "",
            id: next,
            name: artifactMapping[next].name,
            salvage: !keep
          });
          if (keep) {
            list = [];
            num += 1;
          }
          currentSeed = unityRandom[currentSeed].nextSeed;
        } else {
          var totalArtifacts = $scope.artifacts[$rootScope.world].length;
          var numOwned = totalArtifacts - list.length;
          var index = unityRandom[currentSeed].values[numOwned];
          var next = list[index].id;
          var keep = !salvages[steps.length];

          if (keep) {
            list.splice(index, 1);
          }
          steps.push({
            n: keep ? num + "." : "",
            id: next,
            name: artifactMapping[next].name,
            salvage: !keep
          });
          if (keep) {
            num += 1;
          }
          currentSeed = unityRandom[currentSeed].nextSeed;
          // console.log("seed now: " + currentSeed);
        }
      }

      return steps;
    };

 $scope.calculateArtifacts();

// file:///E:/Android/Projects/ASWorkspace/MyProjects/TTHelper/WebApp/Relic%20Calculator/index.html

// ?c=0_0.0_14.0_2.0_3.0_6.0_1.0_4.0_5.1_0.1_9.1_1.1_3.1_2.1_11.1_8.1_4.1_5.1_6.1_10.2_0.2_3.2_1.2_2.2_4.2_8.2_16.3_0.3_901.3_902.3_903.3_904.3_905.3_906.3_907.3_19.3_3.3_4.3_30.3_26.3_1.3_13.3_5.3_15.3_20.3_14.4_0.4_1.4_2.4_3.4_4.4_7.4_8.4_9.5_0.5_1.5_2.5_3.5_5.5_4.5_8

// &al=8_10.9_10.6_10.7_10.19_328.4_25.5_25.17_295.2_60.3_25.18_250.15_140.16_182.13_170.14_228.11_10.12_182.10_10.28_10.29_309.24_25.25_5.26_101.27_220.20_112.21_85.22_232.23_10.39_0.62_0.63_0.61_6.33_0.34_0.37_0.38_0.35_0.36_5.67_6.66_6.65_0.69_0.50_0.51_0.52_7.42_10.43_0.45_0.46_0.49_6.40_0.1_250.54_0.56_0.55_2.58_0.57_0.59_0

// &hl=19_0.17_0.18_0.33_0.15_0.16_0.13_0.14_0.11_0.12_0.21_0.20_0.22_0.23_0.24_0.25_0.26_0.27_0.28_0.29_0.3_464.2_528.10_0.1_613.30_0.7_0.6_0.32_0.5_0.31_0.4_0.9_0.8_0

// &wu=19_2.17_7.18_3.33_7.15_6.16_4.13_2.14_4.11_7.12_3.21_5.20_3.22_4.23_3.24_7.25_6.26_2.27_2.28_6.29_3.3_3.2_6.10_7.1_3.30_4.7_8.6_6.32_4.5_8.31_4.4_6.9_6.8_6

// &spl=852

// &r=1000000

// &as=2729

// &me=1
