DROP FUNCTION TMS.CHECK_COND;

CREATE OR REPLACE FUNCTION TMS.check_cond
   RETURN NUMBER
IS
   v_app_id   NUMBER;
BEGIN
   -- Get the current APEX Application ID
   v_app_id := TO_NUMBER (V ('APP_ID'));

   -- Return TRUE (1) if APP_ID is 16333, otherwise FALSE (0)
   IF v_app_id = 16333
   THEN
      RETURN 1;
   ELSE
      RETURN 0;
   END IF;
END check_cond;
/


DROP FUNCTION TMS.CHECK_CONDITION;

CREATE OR REPLACE FUNCTION TMS.check_condition
   RETURN NUMBER
IS
   v_app_id   NUMBER;
BEGIN
   -- Get the current APEX Application ID
   v_app_id := TO_NUMBER (V ('APP_ID'));

   -- Return TRUE (1) if APP_ID is 16333, otherwise FALSE (0)
   IF v_app_id = 16333
   THEN
      RETURN 1;
   ELSE
      RETURN 0;
   END IF;
END check_condition;
/


DROP FUNCTION TMS.CHECK_SYS_COND_WRAP;

CREATE OR REPLACE FUNCTION TMS.check_sys_cond_wrap
RETURN NUMBER IS
BEGIN
    RETURN sys.check_sys_cond();
END check_sys_cond_wrap;
/


DROP FUNCTION TMS.FN_CUSTOM_LOGIN;

CREATE OR REPLACE FUNCTION TMS.fn_custom_login (p_username   IN VARCHAR2,
                                                p_password   IN VARCHAR2)
   RETURN BOOLEAN
IS
   v_password          VARCHAR2 (4000);
   v_stored_password   VARCHAR2 (4000);
   v_expires_on        DATE;
   v_count             NUMBER;
BEGIN
   SELECT COUNT (*)
     INTO v_count
     FROM appuser
    WHERE     (   LOWER (username) = LOWER (p_username)
               OR LOWER (email) = LOWER (p_username))
          AND STATUS = 'A';

   IF v_count != 0
   THEN
      SELECT pass
        INTO v_stored_password
        FROM appuser
       WHERE     (   LOWER (username) = LOWER (p_username)
                  OR LOWER (email) = LOWER (p_username))
             AND STATUS = 'A';

      v_password := p_password;

      IF v_password = v_stored_password
      THEN
         RETURN TRUE;
      ELSE
         RETURN FALSE;
      END IF;
   END IF;
END fn_custom_login;
/


DROP FUNCTION TMS.F_CUS_LOG_LOT;

CREATE OR REPLACE FUNCTION TMS.f_cus_log_lot (p_username   IN VARCHAR2,
                                          p_password   IN VARCHAR2)
    RETURN BOOLEAN
IS
    v_password          VARCHAR2 (4000);
    v_stored_password   VARCHAR2 (4000);
    v_expires_on        DATE;
    v_count             NUMBER;
BEGIN
    SELECT COUNT (*)
      INTO v_count
      FROM LOTTERY_NAMES
     WHERE UPPER (EMAIL) = UPPER (p_username) AND UG_GRP IN (0, 10);

    IF v_count != 0
    THEN
        SELECT pass
          INTO v_stored_password
          FROM LOTTERY_NAMES
         WHERE     UPPER (EMAIL) = UPPER (p_username)
               AND UG_GRP IN (0, 10);

        v_password := p_password;

        IF v_password = v_stored_password
        THEN
            RETURN TRUE;
        ELSE
            RETURN FALSE;
        END IF;
    END IF;
END f_cus_log_lot;
/


DROP FUNCTION TMS.WM_CONCAT;

CREATE OR REPLACE FUNCTION TMS.WM_CONCAT (p_input VARCHAR2)
    RETURN VARCHAR2
    PARALLEL_ENABLE
    AGGREGATE USING t_string_agg;
/
