package com.unmanned.billiards.service;

import com.unmanned.billiards.entity.Session;
import java.util.Map;
import java.util.Date;

public interface BillingService {
    Map<String, Object> settleSession(Session session, Date endTime, boolean allowNegative) throws Exception;
}
